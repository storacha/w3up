import assert from 'assert'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import { provide } from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Signer from '@ucanto/principal/ed25519'
import * as StoreCapabilities from '@web3-storage/capabilities/store'
import { CID } from 'multiformats'
import { createFileEncoderStream } from '../src/unixfs.js'
import { ShardingStream, ShardStoringStream } from '../src/sharding.js'
import { serviceSigner } from './fixtures.js'
import { randomBytes, randomCAR } from './helpers/random.js'
import { mockService } from './helpers/mocks.js'

describe('ShardingStream', () => {
  it('creates shards from blocks', async () => {
    const file = new Blob([await randomBytes(1024 * 1024 * 5)])
    const shardSize = 1024 * 1024 * 2

    /** @type {import('../src/types').CARFile[]} */
    const shards = []

    await createFileEncoderStream(file)
      .pipeThrough(new ShardingStream({ shardSize }))
      .pipeTo(
        new WritableStream({
          write: (s) => {
            shards.push(s)
          },
        })
      )

    assert(shards.length > 1)

    for (const car of shards) {
      // add 100 bytes leeway to the chunk size for encoded CAR data
      assert(car.size <= shardSize + 100)
    }
  })

  it('uses passed root CID', async () => {
    const file = new Blob([await randomBytes(32)])

    const rootCID = CID.parse(
      'bafybeibrqc2se2p3k4kfdwg7deigdggamlumemkiggrnqw3edrjosqhvnm'
    )
    /** @type {import('../src/types').CARFile[]} */
    const shards = []

    await createFileEncoderStream(file)
      .pipeThrough(new ShardingStream({ rootCID }))
      .pipeTo(
        new WritableStream({
          write: (s) => {
            shards.push(s)
          },
        })
      )

    assert.equal(shards.length, 1)
    assert.equal(shards[0].roots[0].toString(), rootCID.toString())
  })
})

describe('ShardStoringStream', () => {
  it('stores multiple DAGs with the service', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const cars = await Promise.all([randomCAR(128), randomCAR(128)])
    let invokes = 0

    const proofs = [
      await StoreCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    /** @type {import('../src/types.js').StoreAddUploadRequiredResponse[]} */
    const res = [
      {
        status: 'upload',
        headers: { 'x-test': 'true' },
        url: 'http://localhost:9200',
        link: cars[0].cid,
        with: space.did(),
      },
      {
        status: 'upload',
        headers: { 'x-test2': 'true' },
        url: 'http://localhost:9200',
        link: cars[0].cid,
        with: space.did(),
      },
    ]

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, ({ invocation }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, 'store/add')
          assert.equal(invCap.with, space.did())
          assert.equal(String(invCap.nb?.link), cars[invokes].cid.toString())
          return res[invokes++]
        }),
      },
    })

    const server = Server.create({
      id: serviceSigner,
      service,
      decoder: CAR,
      encoder: CBOR,
    })
    const connection = Client.connect({
      id: serviceSigner,
      encoder: CAR,
      decoder: CBOR,
      channel: server,
    })

    let pulls = 0
    const carStream = new ReadableStream({
      pull(controller) {
        if (pulls >= cars.length) return controller.close()
        controller.enqueue(cars[pulls])
        pulls++
      },
    })

    /** @type {import('../src/types').CARLink[]} */
    const carCIDs = []
    await carStream
      .pipeThrough(
        new ShardStoringStream(
          { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
          { connection }
        )
      )
      .pipeTo(
        new WritableStream({
          write: ({ cid }) => {
            carCIDs.push(cid)
          },
        })
      )

    cars.forEach(({ cid }, i) =>
      assert.equal(cid.toString(), carCIDs[i].toString())
    )

    assert(service.store.add.called)
    assert.equal(service.store.add.callCount, 2)
  })

  it('aborts on service failure', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const cars = await Promise.all([randomCAR(128), randomCAR(128)])

    const proofs = [
      await StoreCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, () => {
          throw new Server.Failure('boom')
        }),
      },
    })

    const server = Server.create({
      id: serviceSigner,
      service,
      decoder: CAR,
      encoder: CBOR,
    })
    const connection = Client.connect({
      id: serviceSigner,
      encoder: CAR,
      decoder: CBOR,
      channel: server,
    })

    let pulls = 0
    const carStream = new ReadableStream({
      pull(controller) {
        if (pulls >= cars.length) return controller.close()
        controller.enqueue(cars[pulls])
        pulls++
      },
    })

    await assert.rejects(
      carStream
        .pipeThrough(
          new ShardStoringStream(
            {
              issuer: agent,
              with: space.did(),
              proofs,
              audience: serviceSigner,
            },
            { connection }
          )
        )
        .pipeTo(new WritableStream()),
      { message: 'failed store/add invocation' }
    )
  })
})

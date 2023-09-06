import assert from 'assert'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import { provide } from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as Signer from '@ucanto/principal/ed25519'
import * as StoreCapabilities from '@web3-storage/capabilities/store'
import { CID } from 'multiformats'
import { createFileEncoderStream } from '../src/unixfs.js'
import { ShardingStream, ShardStoringStream } from '../src/sharding.js'
import { serviceSigner } from './fixtures.js'
import { randomBlock, randomBytes, randomCAR } from './helpers/random.js'
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

  it('fails to shard block that exceeds shard size when encoded', async () => {
    const file = new Blob([await randomBytes(128)])
    await assert.rejects(() => createFileEncoderStream(file)
      .pipeThrough(new ShardingStream({ shardSize: 64 }))
      .pipeTo(new WritableStream()), /block exceeds shard size/)
  })

  it('reduces final shard to accomodate CAR header with root CID', async () => {
    const blocks = [
      await randomBlock(128), // encoded block length = 166
      await randomBlock(64),  // encoded block length = 102
      await randomBlock(32)   // encoded block length = 70
    ]

    /** @type {import('../src/types').CARFile[]} */
    const shards = []
    await new ReadableStream({
        pull (controller) {
          const block = blocks.shift()
          if (!block) return controller.close()
          controller.enqueue(block)
        }
      })
      // shard with no roots = encoded block (166) + CAR header (17) = 183
      // shard with no roots = encoded block (102) + CAR header (17) = 119
      // shard with 1 root = encoded block (70) + CAR header (17) = 87
      // shard with 1 root = encoded block (70) + CAR header (59) = 155
      // i.e. shard size of 206 (119 + 87) should allow us 1 shard with 0 roots
      // and then 1 shard with 2 blocks that, when encoded as a CAR with 1 root
      // will actually exceed the shard size. It must then be refactored into
      // 2 shards.
      .pipeThrough(new ShardingStream({ shardSize: 206 }))
      .pipeTo(new WritableStream({ write: s => { shards.push(s) } }))

    assert.equal(shards.length, 3)
  })

  it('fails to shard block that exceeds shard size when encoded with root CID', async () => {
    const blocks = [
      await randomBlock(128) // encoded block length = 166
    ]

    await assert.rejects(() => {
      return new ReadableStream({
        pull (controller) {
          const block = blocks.shift()
          if (!block) return controller.close()
          controller.enqueue(block)
        }
      })
      // shard with no roots = encoded block (166) + CAR header (17) = 183
      // shard with 1 root = encoded block (166) + CAR header (59) = 225
      // i.e. shard size of 183 should allow us 1 shard with no roots and then
      // we'll fail to create a shard with 1 root.
      .pipeThrough(new ShardingStream({ shardSize: 183 }))
      .pipeTo(new WritableStream())
    }, /block exceeds shard size/)
  })

  it('no blocks no shards', async () => {
    let shards = 0
    await new ReadableStream({ pull: controller => { controller.close() } })
      .pipeThrough(new ShardingStream({ shardSize: 206 }))
      .pipeTo(new WritableStream({ write: () => { shards++ } }))
    assert.equal(shards, 0)
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

    /** @type {import('../src/types.js').StoreAddUpload[]} */
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
          return { ok: res[invokes++] }
        }),
      },
    })

    const server = Server.create({
      id: serviceSigner,
      service,
      codec: CAR.inbound,
    })
    const connection = Client.connect({
      id: serviceSigner,
      codec: CAR.outbound,
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
      codec: CAR.inbound,
    })
    const connection = Client.connect({
      id: serviceSigner,
      codec: CAR.outbound,
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

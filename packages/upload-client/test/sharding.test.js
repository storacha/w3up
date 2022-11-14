import assert from 'assert'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Signer from '@ucanto/principal/ed25519'
import { add as storeAdd } from '@web3-storage/access/capabilities/store'
import { createFileEncoderStream } from '../src/unixfs.js'
import { ShardingStream, ShardStoringStream } from '../src/sharding.js'
import { service as id } from './fixtures.js'
import { randomBytes, randomCAR } from './helpers/random.js'
import { mockService } from './helpers/mocks.js'

describe('ShardingStream', () => {
  it('creates shards from blocks', async () => {
    const file = new Blob([await randomBytes(1024 * 1024)])
    const shardSize = 512 * 1024

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
})

describe('ShardStoringStream', () => {
  it('stores multiple DAGs with the service', async () => {
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9000',
    }

    const account = await Signer.generate()
    const issuer = await Signer.generate()
    const cars = await Promise.all([randomCAR(128), randomCAR(128)])
    let invokes = 0

    const proofs = [
      await storeAdd.delegate({
        issuer: account,
        audience: id,
        with: account.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      store: {
        add(invocation) {
          assert.equal(invocation.issuer.did(), issuer.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, 'store/add')
          assert.equal(invCap.with, account.did())
          assert.equal(String(invCap.nb.link), cars[invokes].cid.toString())
          invokes++
          return res
        },
      },
    })

    const server = Server.create({ id, service, decoder: CAR, encoder: CBOR })
    const connection = Client.connect({
      id,
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
      .pipeThrough(new ShardStoringStream({ issuer, proofs }, { connection }))
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
  })
})

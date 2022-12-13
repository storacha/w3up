import assert from 'assert'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import { provide } from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Signer from '@ucanto/principal/ed25519'
import * as UploadCapabilities from '@web3-storage/capabilities/upload'
import * as Upload from '../src/upload.js'
import { serviceSigner } from './fixtures.js'
import { randomCAR } from './helpers/random.js'
import { mockService } from './helpers/mocks.js'

describe('Upload.add', () => {
  it('registers an upload with the service', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const res = {
      root: car.roots[0],
      shards: [car.cid],
    }

    const proofs = [
      await UploadCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      upload: {
        add: provide(UploadCapabilities.add, ({ invocation }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, UploadCapabilities.add.can)
          assert.equal(invCap.with, space.did())
          assert.equal(String(invCap.nb?.root), car.roots[0].toString())
          assert.equal(invCap.nb?.shards?.length, 1)
          assert.equal(String(invCap.nb?.shards?.[0]), car.cid.toString())
          return res
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

    const root = car.roots[0]
    const actual = await Upload.add(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      root,
      [car.cid],
      { connection }
    )

    assert(service.upload.add.called)
    assert.equal(service.upload.add.callCount, 1)
    assert.equal(actual.root.toString(), res.root.toString())
    assert.deepEqual(
      new Set(actual.shards?.map((s) => s.toString())),
      new Set(res.shards.map((s) => s.toString()))
    )
  })

  it('throws on service error', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await UploadCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      upload: {
        add: provide(UploadCapabilities.add, () => {
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

    await assert.rejects(
      Upload.add(
        { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
        car.roots[0],
        [car.cid],
        {
          connection,
        }
      ),
      { message: 'failed upload/add invocation' }
    )
  })
})

describe('Upload.list', () => {
  it('lists uploads', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()

    const car = await randomCAR(128)
    const res = {
      cursor: 'test',
      size: 1000,
      results: [
        {
          root: car.roots[0],
          shards: [car.cid],
        },
      ],
    }
    const proofs = [
      await UploadCapabilities.list.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      upload: {
        list: provide(UploadCapabilities.list, ({ invocation }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, UploadCapabilities.list.can)
          assert.equal(invCap.with, space.did())
          return res
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

    const list = await Upload.list(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      { connection }
    )

    assert(service.upload.list.called)
    assert.equal(service.upload.list.callCount, 1)

    assert.equal(list.cursor, res.cursor)
    assert.equal(list.size, res.size)
    assert(list.results)
    assert.equal(list.results.length, res.results.length)
    list.results.forEach((r, i) => {
      assert.equal(r.root.toString(), res.results[i].root.toString())
      assert.deepStrictEqual(
        new Set(r.shards?.map((s) => s.toString())),
        new Set(res.results[i].shards.map((s) => s.toString()))
      )
    })
  })

  it('paginates', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()

    const cursor = 'test'
    const car0 = await randomCAR(128)
    const page0 = {
      cursor,
      size: 1,
      results: [
        {
          root: car0.roots[0],
          shards: [car0.cid],
        },
      ],
    }
    const car1 = await randomCAR(128)
    const page1 = {
      size: 1,
      results: [
        {
          root: car1.roots[0],
          shards: [car1.cid],
        },
      ],
    }
    const proofs = [
      await UploadCapabilities.list.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      upload: {
        list: provide(UploadCapabilities.list, ({ invocation }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, UploadCapabilities.list.can)
          assert.equal(invCap.with, space.did())
          assert.equal(invCap.nb?.size, 1)
          return invCap.nb?.cursor === cursor ? page1 : page0
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

    const results0 = await Upload.list(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      { size: 1, connection }
    )
    const results1 = await Upload.list(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      { size: 1, cursor: results0.cursor, connection }
    )

    assert(service.upload.list.called)
    assert.equal(service.upload.list.callCount, 2)

    assert.equal(results0.cursor, page0.cursor)
    assert.equal(results0.size, page0.size)
    assert(results0.results)
    assert.equal(results0.results.length, page0.results.length)
    results0.results.forEach((r, i) => {
      assert.equal(r.root.toString(), page0.results[i].root.toString())
      assert.deepStrictEqual(
        new Set(r.shards?.map((s) => s.toString())),
        new Set(page0.results[i].shards.map((s) => s.toString()))
      )
    })

    assert.equal(results1.cursor, undefined)
    assert.equal(results1.size, page1.size)
    assert(results1.results)
    assert.equal(results1.results.length, page1.results.length)
    results1.results.forEach((r, i) => {
      assert.equal(r.root.toString(), page1.results[i].root.toString())
      assert.deepStrictEqual(
        new Set(r.shards?.map((s) => s.toString())),
        new Set(page1.results[i].shards.map((s) => s.toString()))
      )
    })
  })

  it('throws on service error', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()

    const proofs = [
      await UploadCapabilities.list.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      upload: {
        list: provide(UploadCapabilities.list, () => {
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

    await assert.rejects(
      Upload.list(
        { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
        { connection }
      ),
      {
        message: 'failed upload/list invocation',
      }
    )
  })
})

describe('Upload.remove', () => {
  it('removes an upload', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await UploadCapabilities.remove.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      upload: {
        remove: provide(UploadCapabilities.remove, ({ invocation }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, UploadCapabilities.remove.can)
          assert.equal(invCap.with, space.did())
          assert.equal(String(invCap.nb?.root), car.roots[0].toString())
          return { root: car.roots[0] }
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

    await Upload.remove(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      car.roots[0],
      { connection }
    )

    assert(service.upload.remove.called)
    assert.equal(service.upload.remove.callCount, 1)
  })

  it('throws on service error', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await UploadCapabilities.remove.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      upload: {
        remove: provide(UploadCapabilities.remove, () => {
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

    await assert.rejects(
      Upload.remove(
        { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
        car.roots[0],
        { connection }
      ),
      { message: 'failed upload/remove invocation' }
    )
  })
})

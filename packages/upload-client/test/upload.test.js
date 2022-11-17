import assert from 'assert'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Signer from '@ucanto/principal/ed25519'
import * as UploadCapabilities from '@web3-storage/access/capabilities/upload'
import * as Upload from '../src/upload.js'
import { serviceSigner } from './fixtures.js'
import { randomCAR } from './helpers/random.js'
import { mockService } from './helpers/mocks.js'

describe('Upload.add', () => {
  it('registers an upload with the service', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await UploadCapabilities.add.delegate({
        issuer: space,
        audience: serviceSigner,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      upload: {
        add: (invocation) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, UploadCapabilities.add.can)
          assert.equal(invCap.with, space.did())
          assert.equal(String(invCap.nb.root), car.roots[0].toString())
          assert.equal(invCap.nb.shards?.length, 1)
          assert.equal(String(invCap.nb.shards?.[0]), car.cid.toString())
          return null
        },
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
    await Upload.add({ issuer: agent, proofs }, root, [car.cid], { connection })

    assert(service.upload.add.called)
    assert.equal(service.upload.add.callCount, 1)
  })

  it('throws on service error', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await UploadCapabilities.add.delegate({
        issuer: space,
        audience: serviceSigner,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      upload: {
        add: () => {
          throw new Server.Failure('boom')
        },
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
      Upload.add({ issuer: agent, proofs }, car.roots[0], [car.cid], {
        connection,
      }),
      { message: 'failed upload/add invocation' }
    )
  })
})

describe('Upload.list', () => {
  it('lists uploads', async () => {
    const car = await randomCAR(128)
    const res = {
      page: 1,
      pageSize: 1000,
      count: 1,
      results: [
        {
          carCID: car.cid,
          dataCID: car.roots[0],
          uploadedAt: Date.now(),
        },
      ],
    }

    const space = await Signer.generate()
    const agent = await Signer.generate()

    const proofs = [
      await UploadCapabilities.list.delegate({
        issuer: space,
        audience: serviceSigner,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      upload: {
        list(invocation) {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, UploadCapabilities.list.can)
          assert.equal(invCap.with, space.did())
          return res
        },
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

    const list = await Upload.list({ issuer: agent, proofs }, { connection })

    assert(service.upload.list.called)
    assert.equal(service.upload.list.callCount, 1)

    assert.equal(list.count, res.count)
    assert.equal(list.page, res.page)
    assert.equal(list.pageSize, res.pageSize)
    assert(list.results)
    assert.equal(list.results.length, res.results.length)
    list.results.forEach((r, i) => {
      assert.equal(r.carCID.toString(), res.results[i].carCID.toString())
      assert.equal(r.dataCID.toString(), res.results[i].dataCID.toString())
      assert.equal(r.uploadedAt, res.results[i].uploadedAt)
    })
  })

  it('throws on service error', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()

    const proofs = [
      await UploadCapabilities.list.delegate({
        issuer: space,
        audience: serviceSigner,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      upload: {
        list: () => {
          throw new Server.Failure('boom')
        },
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
      Upload.list({ issuer: agent, proofs }, { connection }),
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
        audience: serviceSigner,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      upload: {
        remove(invocation) {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, UploadCapabilities.remove.can)
          assert.equal(invCap.with, space.did())
          assert.equal(String(invCap.nb.root), car.roots[0].toString())
          return null
        },
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

    await Upload.remove({ issuer: agent, proofs }, car.roots[0], { connection })

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
        audience: serviceSigner,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      upload: {
        remove: () => {
          throw new Server.Failure('boom')
        },
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
      Upload.remove({ issuer: agent, proofs }, car.roots[0], { connection }),
      { message: 'failed upload/remove invocation' }
    )
  })
})

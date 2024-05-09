import assert from 'assert'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import { provide } from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as Signer from '@ucanto/principal/ed25519'
import * as UCAN from '@web3-storage/capabilities/ucan'
import * as BlobCapabilities from '@web3-storage/capabilities/blob'
import * as Blob from '../src/blob.js'
import { serviceSigner } from './fixtures.js'
import { randomCAR } from './helpers/random.js'
import { mockService } from './helpers/mocks.js'
import {
  validateAuthorization,
  setupBlobAddSuccessResponse,
  setupBlobAdd4xxResponse,
  setupBlobAdd5xxResponse,
} from './helpers/utils.js'
import { fetchWithUploadProgress } from '../src/fetch-with-upload-progress.js'

describe('Blob.add', () => {
  it('stores a DAG with the service', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await BlobCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      ucan: {
        conclude: provide(UCAN.conclude, () => {
          return { ok: { time: Date.now() } }
        }),
      },
      blob: {
        // @ts-ignore Argument of type
        add: provide(BlobCapabilities.add, ({ invocation }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, BlobCapabilities.add.can)
          assert.equal(invCap.with, space.did())
          assert.deepEqual(invCap.nb?.blob.digest, car.cid.multihash.bytes)
          return setupBlobAddSuccessResponse(
            { issuer: space, audience: agent, with: space, proofs },
            invocation
          )
        }),
      },
    })

    const server = Server.create({
      id: serviceSigner,
      service,
      codec: CAR.inbound,
      validateAuthorization,
    })
    const connection = Client.connect({
      id: serviceSigner,
      codec: CAR.outbound,
      channel: server,
    })

    /** @type {import('../src/types.js').ProgressStatus[]} */
    const progress = []
    const multihash = await Blob.add(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      car,
      {
        connection,
        onUploadProgress: (status) => {
          assert(typeof status.loaded === 'number' && status.loaded > 0)
          progress.push(status)
        },
        fetchWithUploadProgress,
      }
    )

    assert(service.blob.add.called)
    assert.equal(service.blob.add.callCount, 1)
    assert.equal(
      progress.reduce((max, { loaded }) => Math.max(max, loaded), 0),
      225
    )

    assert(multihash)
    assert.deepEqual(multihash.digest, car.cid.multihash.digest)

    // make sure it can also work without fetchWithUploadProgress
    /** @type {import('../src/types.js').ProgressStatus[]} */
    let progressWithoutUploadProgress = []
    const addedWithoutUploadProgress = await Blob.add(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      car,
      {
        connection,
        onUploadProgress: (status) => {
          progressWithoutUploadProgress.push(status)
        },
      }
    )
    assert.deepEqual(
      addedWithoutUploadProgress.digest,
      car.cid.multihash.digest
    )
    assert.equal(
      progressWithoutUploadProgress.reduce(
        (max, { loaded }) => Math.max(max, loaded),
        0
      ),
      225
    )
  })

  it('throws for a failed conclude invocation', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await BlobCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      ucan: {
        conclude: provide(UCAN.conclude, () => {
          return Server.fail('ouch')
        }),
      },
      blob: {
        // @ts-ignore Argument of type
        add: provide(BlobCapabilities.add, ({ invocation }) => {
          return setupBlobAddSuccessResponse(
            { issuer: space, audience: agent, with: space, proofs },
            invocation
          )
        }),
      },
    })

    const server = Server.create({
      id: serviceSigner,
      service,
      codec: CAR.inbound,
      validateAuthorization,
    })
    const connection = Client.connect({
      id: serviceSigner,
      codec: CAR.outbound,
      channel: server,
    })

    await assert.rejects(
      Blob.add(
        { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
        car,
        { connection }
      ),
      {
        message: 'failed blob/add invocation',
      }
    )
  })

  it('throws for bucket URL client error 4xx', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await BlobCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      ucan: {
        conclude: provide(UCAN.conclude, () => {
          return { ok: { time: Date.now() } }
        }),
      },
      blob: {
        // @ts-ignore Argument of type
        add: provide(BlobCapabilities.add, ({ invocation }) => {
          return setupBlobAdd4xxResponse(
            { issuer: space, audience: agent, with: space, proofs },
            invocation
          )
        }),
      },
    })

    const server = Server.create({
      id: serviceSigner,
      service,
      codec: CAR.inbound,
      validateAuthorization,
    })
    const connection = Client.connect({
      id: serviceSigner,
      codec: CAR.outbound,
      channel: server,
    })

    await assert.rejects(
      Blob.add(
        { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
        car,
        { connection }
      ),
      {
        message: 'upload failed: 400',
      }
    )
  })

  it('throws for bucket URL server error 5xx', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await BlobCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      ucan: {
        conclude: provide(UCAN.conclude, () => {
          return { ok: { time: Date.now() } }
        }),
      },
      blob: {
        // @ts-ignore Argument of type
        add: provide(BlobCapabilities.add, ({ invocation }) => {
          return setupBlobAdd5xxResponse(
            { issuer: space, audience: agent, with: space, proofs },
            invocation
          )
        }),
      },
    })

    const server = Server.create({
      id: serviceSigner,
      service,
      codec: CAR.inbound,
      validateAuthorization,
    })
    const connection = Client.connect({
      id: serviceSigner,
      codec: CAR.outbound,
      channel: server,
    })

    await assert.rejects(
      Blob.add(
        { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
        car,
        { connection }
      ),
      {
        message: 'upload failed: 500',
      }
    )
  })

  it('aborts', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const service = mockService({
      ucan: {
        conclude: provide(UCAN.conclude, () => {
          return { ok: { time: Date.now() } }
        }),
      },
      blob: {
        // @ts-ignore Argument of type
        add: provide(BlobCapabilities.add, ({ invocation }) => {
          return setupBlobAddSuccessResponse(
            { issuer: space, audience: agent, with: space, proofs },
            invocation
          )
        }),
      },
    })

    const server = Server.create({
      id: serviceSigner,
      service,
      codec: CAR.inbound,
      validateAuthorization,
    })
    const connection = Client.connect({
      id: serviceSigner,
      codec: CAR.outbound,
      channel: server,
    })

    const proofs = [
      await BlobCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const controller = new AbortController()
    controller.abort() // already aborted

    await assert.rejects(
      Blob.add(
        { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
        car,
        {
          connection,
          signal: controller.signal,
        }
      ),
      { name: 'Error', message: 'upload aborted' }
    )
  })

  it('throws on service error', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await BlobCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      ucan: {
        conclude: provide(UCAN.conclude, () => {
          return { ok: { time: Date.now() } }
        }),
      },
      blob: {
        add: provide(BlobCapabilities.add, () => {
          throw new Server.Failure('boom')
        }),
      },
    })

    const server = Server.create({
      id: serviceSigner,
      service,
      codec: CAR.inbound,
      validateAuthorization,
    })
    const connection = Client.connect({
      id: serviceSigner,
      codec: CAR.outbound,
      channel: server,
    })

    await assert.rejects(
      Blob.add(
        { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
        car,
        { connection }
      ),
      { message: 'failed blob/add invocation' }
    )
  })
})

describe('Blob.list', () => {
  it('lists stored CAR files', async () => {
    const car = await randomCAR(128)
    const res = {
      cursor: 'test',
      size: 1000,
      results: [
        {
          blob: {
            digest: car.cid.bytes,
            size: 123,
          },
          insertedAt: '1970-01-01T00:00:00.000Z',
        },
      ],
    }

    const space = await Signer.generate()
    const agent = await Signer.generate()

    const proofs = [
      await BlobCapabilities.list.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      blob: {
        list: provide(BlobCapabilities.list, ({ invocation }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, BlobCapabilities.list.can)
          assert.equal(invCap.with, space.did())
          return { ok: res }
        }),
      },
    })

    const server = Server.create({
      id: serviceSigner,
      service,
      codec: CAR.inbound,
      validateAuthorization,
    })
    const connection = Client.connect({
      id: serviceSigner,
      codec: CAR.outbound,
      channel: server,
    })

    const list = await Blob.list(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      { connection }
    )

    assert(service.blob.list.called)
    assert.equal(service.blob.list.callCount, 1)

    assert.equal(list.cursor, res.cursor)
    assert.equal(list.size, res.size)
    assert(list.results)
    assert.equal(list.results.length, res.results.length)
    list.results.forEach((r, i) => {
      assert.deepEqual(r.blob.digest, res.results[i].blob.digest)
      assert.deepEqual(r.blob.size, res.results[i].blob.size)
    })
  })

  it('paginates', async () => {
    const cursor = 'test'
    const page0 = {
      cursor,
      size: 1,
      results: [
        {
          blob: {
            digest: (await randomCAR(128)).cid.bytes,
            size: 123,
          },
          insertedAt: '1970-01-01T00:00:00.000Z',
        },
      ],
    }
    const page1 = {
      size: 1,
      results: [
        {
          blob: {
            digest: (await randomCAR(128)).cid.bytes,
            size: 123,
          },
          insertedAt: '1970-01-01T00:00:00.000Z',
        },
      ],
    }

    const space = await Signer.generate()
    const agent = await Signer.generate()

    const proofs = [
      await BlobCapabilities.list.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      blob: {
        list: provide(BlobCapabilities.list, ({ invocation }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, BlobCapabilities.list.can)
          assert.equal(invCap.with, space.did())
          assert.equal(invCap.nb?.size, 1)
          return { ok: invCap.nb?.cursor === cursor ? page1 : page0 }
        }),
      },
    })

    const server = Server.create({
      id: serviceSigner,
      service,
      codec: CAR.inbound,
      validateAuthorization,
    })
    const connection = Client.connect({
      id: serviceSigner,
      codec: CAR.outbound,
      channel: server,
    })

    const results0 = await Blob.list(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      { size: 1, connection }
    )
    const results1 = await Blob.list(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      { size: 1, cursor: results0.cursor, connection }
    )

    assert(service.blob.list.called)
    assert.equal(service.blob.list.callCount, 2)

    assert.equal(results0.cursor, cursor)
    assert(results0.results)
    assert.equal(results0.results.length, page0.results.length)
    results0.results.forEach((r, i) => {
      assert.deepStrictEqual(r.blob.digest, page0.results[i].blob.digest)
      assert.deepEqual(r.blob.size, page0.results[i].blob.size)
    })

    assert(results1.results)
    assert.equal(results1.cursor, undefined)
    assert.equal(results1.results.length, page1.results.length)
    results1.results.forEach((r, i) => {
      assert.deepStrictEqual(r.blob.digest, page1.results[i].blob.digest)
      assert.deepEqual(r.blob.size, page1.results[i].blob.size)
    })
  })

  it('throws on service error', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()

    const proofs = [
      await BlobCapabilities.list.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      blob: {
        list: provide(BlobCapabilities.list, () => {
          throw new Server.Failure('boom')
        }),
      },
    })

    const server = Server.create({
      id: serviceSigner,
      service,
      codec: CAR.inbound,
      validateAuthorization,
    })
    const connection = Client.connect({
      id: serviceSigner,
      codec: CAR.outbound,
      channel: server,
    })

    await assert.rejects(
      Blob.list(
        { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
        { connection }
      ),
      {
        message: 'failed blob/list invocation',
      }
    )
  })
})

describe('Blob.remove', () => {
  it('removes a stored CAR file', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await BlobCapabilities.remove.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      blob: {
        remove: provide(BlobCapabilities.remove, ({ invocation }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, BlobCapabilities.remove.can)
          assert.equal(invCap.with, space.did())
          assert.equal(String(invCap.nb?.digest), car.cid.multihash.digest)
          return { ok: { size: car.size } }
        }),
      },
    })

    const server = Server.create({
      id: serviceSigner,
      service,
      codec: CAR.inbound,
      validateAuthorization,
    })
    const connection = Client.connect({
      id: serviceSigner,
      codec: CAR.outbound,
      channel: server,
    })

    const result = await Blob.remove(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      car.cid.multihash,
      { connection }
    )

    assert(service.blob.remove.called)
    assert.equal(service.blob.remove.callCount, 1)

    assert(result.ok)
    assert.equal(result.ok.size, car.size)
  })

  it('throws on service error', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await BlobCapabilities.remove.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      blob: {
        remove: provide(BlobCapabilities.remove, () => {
          throw new Server.Failure('boom')
        }),
      },
    })

    const server = Server.create({
      id: serviceSigner,
      service,
      codec: CAR.inbound,
      validateAuthorization,
    })
    const connection = Client.connect({
      id: serviceSigner,
      codec: CAR.outbound,
      channel: server,
    })

    await assert.rejects(
      Blob.remove(
        { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
        car.cid.multihash,
        { connection }
      ),
      { message: 'failed blob/remove invocation' }
    )
  })
})

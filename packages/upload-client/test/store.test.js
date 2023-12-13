import assert from 'assert'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import { provide } from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as Signer from '@ucanto/principal/ed25519'
import * as StoreCapabilities from '@web3-storage/capabilities/store'
import * as Store from '../src/store.js'
import { serviceSigner } from './fixtures.js'
import { randomCAR } from './helpers/random.js'
import { mockService } from './helpers/mocks.js'
import { validateAuthorization } from './helpers/utils.js'
import { fetchWithUploadProgress } from '../src/fetch-with-upload-progress.js'

describe('Store.add', () => {
  it('stores a DAG with the service', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await StoreCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    /** @type {import('../src/types.js').StoreAddSuccessUpload} */
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9200',
      link: car.cid,
      with: space.did(),
      allocated: car.size,
    }

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, ({ invocation }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, StoreCapabilities.add.can)
          assert.equal(invCap.with, space.did())
          assert.equal(String(invCap.nb?.link), car.cid.toString())
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

    /** @type {import('../src/types.js').ProgressStatus[]} */
    const progress = []
    const carCID = await Store.add(
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

    assert(service.store.add.called)
    assert.equal(service.store.add.callCount, 1)
    assert.equal(
      progress.reduce((max, { loaded }) => Math.max(max, loaded), 0),
      225
    )

    assert(carCID)
    assert.equal(carCID.toString(), car.cid.toString())

    // make sure it can also work without fetchWithUploadProgress
    /** @type {import('../src/types.js').ProgressStatus[]} */
    let progressWithoutUploadProgress = []
    const addedWithoutUploadProgress = await Store.add(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      car,
      {
        connection,
        onUploadProgress: (status) => {
          progressWithoutUploadProgress.push(status)
        },
      }
    )
    assert.equal(addedWithoutUploadProgress.toString(), car.cid.toString())
    assert.equal(
      progressWithoutUploadProgress.reduce(
        (max, { loaded }) => Math.max(max, loaded),
        0
      ),
      225
    )
  })

  it('throws for bucket URL client error 4xx', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await StoreCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    /** @type {import('../src/types.js').StoreAddSuccessUpload} */
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9400', // this bucket always returns a 400
      link: car.cid,
      with: space.did(),
      allocated: car.size,
    }

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, () => ({ ok: res })),
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
      Store.add(
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
      await StoreCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    /** @type {import('../src/types.js').StoreAddSuccessUpload} */
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9500', // this bucket always returns a 500
      link: car.cid,
      with: space.did(),
      allocated: car.size,
    }

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, () => ({ ok: res })),
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
      Store.add(
        { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
        car,
        { connection }
      ),
      {
        message: 'upload failed: 500',
      }
    )
  })

  it('skips sending CAR if status = done', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await StoreCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    /** @type {import('../src/types.js').StoreAddSuccessDone} */
    const res = {
      status: 'done',
      // @ts-expect-error
      headers: { 'x-test': 'true' },
    }

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, () => ({ ok: res })),
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

    const carCID = await Store.add(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      car,
      {
        connection,
      }
    )

    assert(service.store.add.called)
    assert.equal(service.store.add.callCount, 1)

    assert(carCID)
    assert.equal(carCID.toString(), car.cid.toString())
  })

  it('aborts', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    /** @type {import('../src/types.js').StoreAddSuccess} */
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9200',
      link: car.cid,
      with: space.did(),
      allocated: car.size,
    }

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, () => ({ ok: res })),
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
      await StoreCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const controller = new AbortController()
    controller.abort() // already aborted

    await assert.rejects(
      Store.add(
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
      validateAuthorization,
    })
    const connection = Client.connect({
      id: serviceSigner,
      codec: CAR.outbound,
      channel: server,
    })

    await assert.rejects(
      Store.add(
        { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
        car,
        { connection }
      ),
      { message: 'failed store/add invocation' }
    )
  })
})

describe('Store.list', () => {
  it('lists stored CAR files', async () => {
    const car = await randomCAR(128)
    const res = {
      cursor: 'test',
      size: 1000,
      results: [
        {
          link: car.cid,
          size: 123,
          insertedAt: '1970-01-01T00:00:00.000Z',
        },
      ],
    }

    const space = await Signer.generate()
    const agent = await Signer.generate()

    const proofs = [
      await StoreCapabilities.list.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      store: {
        list: provide(StoreCapabilities.list, ({ invocation }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, StoreCapabilities.list.can)
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

    const list = await Store.list(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      { connection }
    )

    assert(service.store.list.called)
    assert.equal(service.store.list.callCount, 1)

    assert.equal(list.cursor, res.cursor)
    assert.equal(list.size, res.size)
    assert(list.results)
    assert.equal(list.results.length, res.results.length)
    list.results.forEach((r, i) => {
      assert.deepEqual(r.link, res.results[i].link)
      assert.deepEqual(r.size, res.results[i].size)
    })
  })

  it('paginates', async () => {
    const cursor = 'test'
    const page0 = {
      cursor,
      size: 1,
      results: [
        {
          link: (await randomCAR(128)).cid,
          size: 123,
          insertedAt: '1970-01-01T00:00:00.000Z',
        },
      ],
    }
    const page1 = {
      size: 1,
      results: [
        {
          link: (await randomCAR(128)).cid,
          size: 123,
          insertedAt: '1970-01-01T00:00:00.000Z',
        },
      ],
    }

    const space = await Signer.generate()
    const agent = await Signer.generate()

    const proofs = [
      await StoreCapabilities.list.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      store: {
        list: provide(StoreCapabilities.list, ({ invocation }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, StoreCapabilities.list.can)
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

    const results0 = await Store.list(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      { size: 1, connection }
    )
    const results1 = await Store.list(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      { size: 1, cursor: results0.cursor, connection }
    )

    assert(service.store.list.called)
    assert.equal(service.store.list.callCount, 2)

    assert.equal(results0.cursor, cursor)
    assert(results0.results)
    assert.equal(results0.results.length, page0.results.length)
    results0.results.forEach((r, i) => {
      assert.equal(r.link.toString(), page0.results[i].link.toString())
      assert.equal(r.size, page0.results[i].size)
    })

    assert(results1.results)
    assert.equal(results1.cursor, undefined)
    assert.equal(results1.results.length, page1.results.length)
    results1.results.forEach((r, i) => {
      assert.equal(r.link.toString(), page1.results[i].link.toString())
      assert.equal(r.size, page1.results[i].size)
    })
  })

  it('throws on service error', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()

    const proofs = [
      await StoreCapabilities.list.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      store: {
        list: provide(StoreCapabilities.list, () => {
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
      Store.list(
        { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
        { connection }
      ),
      {
        message: 'failed store/list invocation',
      }
    )
  })
})

describe('Store.remove', () => {
  it('removes a stored CAR file', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await StoreCapabilities.remove.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      store: {
        remove: provide(StoreCapabilities.remove, ({ invocation }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, StoreCapabilities.remove.can)
          assert.equal(invCap.with, space.did())
          assert.equal(String(invCap.nb?.link), car.cid.toString())
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

    const result = await Store.remove(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      car.cid,
      { connection }
    )

    assert(service.store.remove.called)
    assert.equal(service.store.remove.callCount, 1)

    assert(result.ok)
    assert.equal(result.ok.size, car.size)
  })

  it('throws on service error', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await StoreCapabilities.remove.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      store: {
        remove: provide(StoreCapabilities.remove, () => {
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
      Store.remove(
        { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
        car.cid,
        { connection }
      ),
      { message: 'failed store/remove invocation' }
    )
  })
})

describe('Store.get', () => {
  it('gets stored item', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await StoreCapabilities.get.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      store: {
        get: provide(StoreCapabilities.get, ({ invocation, capability }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          assert.equal(capability.can, StoreCapabilities.get.can)
          assert.equal(capability.with, space.did())
          assert.equal(String(capability.nb?.link), car.cid.toString())
          return {
            ok: {
              link: car.cid,
              size: car.size,
              insertedAt: new Date().toISOString(),
            },
          }
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

    const result = await Store.get(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      car.cid,
      { connection }
    )

    assert(service.store.get.called)
    assert.equal(service.store.get.callCount, 1)

    assert.equal(result.link.toString(), car.cid.toString())
    assert.equal(result.size, car.size)
  })

  it('throws on service error', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await StoreCapabilities.get.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      store: {
        get: provide(StoreCapabilities.get, () => {
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
      Store.get(
        { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
        car.cid,
        { connection }
      ),
      { message: 'failed store/get invocation' }
    )
  })
})

import assert from 'assert'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import { provide } from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Signer from '@ucanto/principal/ed25519'
import * as StoreCapabilities from '@web3-storage/capabilities/store'
import * as Store from '../src/store.js'
import { serviceSigner } from './fixtures.js'
import { randomCAR } from './helpers/random.js'
import { mockService } from './helpers/mocks.js'

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

    /** @type {import('../src/types.js').StoreAddUploadRequiredResponse} */
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9200',
      link: car.cid,
      with: space.did(),
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

    let progressStatusCalls = 0
    const carCID = await Store.add(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      car,
      {
        connection,
        onUploadProgress: (status) => {
          assert(typeof status.loaded === 'number' && status.loaded > 0)
          progressStatusCalls++
        },
      }
    )

    assert(service.store.add.called)
    assert.equal(service.store.add.callCount, 1)
    assert.equal(progressStatusCalls, 1)

    assert(carCID)
    assert.equal(carCID.toString(), car.cid.toString())
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

    /** @type {import('../src/types.js').StoreAddUploadRequiredResponse} */
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9400', // this bucket always returns a 400
      link: car.cid,
      with: space.did(),
    }

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, () => res),
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

    assert.rejects(
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

    /** @type {import('../src/types.js').StoreAddUploadRequiredResponse} */
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9500', // this bucket always returns a 500
      link: car.cid,
      with: space.did(),
    }

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, () => res),
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

    assert.rejects(
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

    /** @type {import('../src/types.js').StoreAddDoneResponse} */
    const res = {
      status: 'done',
      // @ts-expect-error
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9500', // will fail the test if called
    }

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, () => res),
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

    /** @type {import('../src/types.js').StoreAddUploadRequiredResponse} */
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9200',
      link: car.cid,
      with: space.did(),
    }

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, () => res),
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
        },
      ],
    }
    const page1 = {
      size: 1,
      results: [
        {
          link: (await randomCAR(128)).cid,
          size: 123,
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
          return {}
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

    await Store.remove(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      car.cid,
      { connection }
    )

    assert(service.store.remove.called)
    assert.equal(service.store.remove.callCount, 1)
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
      Store.remove(
        { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
        car.cid,
        { connection }
      ),
      { message: 'failed store/remove invocation' }
    )
  })
})

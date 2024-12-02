import { randomCAR } from '../helpers/random.js'
import * as Test from '../test.js'

export const UploadClient = Test.withContext({
  add: {
    'should register an upload': async (
      assert,
      { client: alice, service, provisionsStorage, uploadTable }
    ) => {
      const car = await randomCAR(128)

      const space = await alice.createSpace('test', {
        skipGatewayAuthorization: true,
      })
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      // @ts-expect-error
      await provisionsStorage.put({
        provider: service.did(),
        customer: 'did:mailto:alice@web.mail',
        consumer: space.did(),
      })

      const result = await alice.capability.upload.add(car.roots[0], [car.cid])
      assert.deepEqual(result.root, car.roots[0])
      assert.deepEqual(result.shards, [car.cid])

      assert.deepEqual(await uploadTable.exists(space.did(), car.roots[0]), {
        ok: true,
      })
    },
  },

  list: {
    'should list uploads': async (
      assert,
      { client: alice, service, provisionsStorage, uploadTable }
    ) => {
      const car = await randomCAR(128)

      const space = await alice.createSpace('test', {
        skipGatewayAuthorization: true,
      })
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      // @ts-expect-error
      await provisionsStorage.put({
        provider: service.did(),
        customer: 'did:mailto:alice@web.mail',
        consumer: space.did(),
      })

      assert.deepEqual(await alice.capability.upload.list(), {
        results: [],
        size: 0,
      })

      await alice.capability.upload.add(car.roots[0], [car.cid])

      assert.deepEqual(await uploadTable.exists(space.did(), car.roots[0]), {
        ok: true,
      })

      const list = await alice.capability.upload.list({ nonce: 'retry' })

      const [entry] = list.results

      assert.deepEqual(entry.root, car.roots[0])
      assert.deepEqual(entry.shards, [car.cid])
    },
  },

  remove: {
    'should remove an upload': async (
      assert,
      { client: alice, uploadTable, provisionsStorage, service }
    ) => {
      const car = await randomCAR(128)

      const space = await alice.createSpace('test', {
        skipGatewayAuthorization: true,
      })
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      // @ts-expect-error
      await provisionsStorage.put({
        provider: service.did(),
        customer: 'did:mailto:alice@web.mail',
        consumer: space.did(),
      })

      await alice.capability.upload.add(car.roots[0], [car.cid])
      assert.deepEqual(await uploadTable.exists(space.did(), car.roots[0]), {
        ok: true,
      })

      await alice.capability.upload.remove(car.roots[0])

      assert.deepEqual(await uploadTable.exists(space.did(), car.roots[0]), {
        ok: false,
      })
    },
  },

  get: {
    'should get an upload': async (
      assert,
      { client: alice, service, provisionsStorage }
    ) => {
      const car = await randomCAR(128)

      const space = await alice.createSpace('test', {
        skipGatewayAuthorization: true,
      })
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      // @ts-expect-error
      await provisionsStorage.put({
        provider: service.did(),
        customer: 'did:mailto:alice@web.mail',
        consumer: space.did(),
      })

      await alice.capability.upload.add(car.roots[0], [car.cid])

      const result = await alice.capability.upload.get(car.roots[0])

      assert.deepEqual(result.root, car.roots[0])
      assert.deepEqual(result.shards, [car.cid])
    },
  },
})

Test.test({ UploadClient })

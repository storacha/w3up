import assert from 'assert'
import { create as createServer, provide } from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as Signer from '@ucanto/principal/ed25519'
import { Store as StoreCapabilities } from '@web3-storage/capabilities'
import { AgentData } from '@web3-storage/access/agent'
import { randomCAR } from '../helpers/random.js'
import { mockService, mockServiceConf } from '../helpers/mocks.js'
import { Client } from '../../src/client.js'
import { validateAuthorization } from '../helpers/utils.js'

describe('StoreClient', () => {
  describe('add', () => {
    it('should store a CAR file', async () => {
      const service = mockService({
        store: {
          add: provide(StoreCapabilities.add, ({ invocation }) => {
            assert.equal(invocation.issuer.did(), alice.agent.did())
            assert.equal(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.equal(invCap.can, StoreCapabilities.add.can)
            assert.equal(invCap.with, alice.currentSpace()?.did())
            return {
              ok: {
                status: 'upload',
                headers: { 'x-test': 'true' },
                url: 'http://localhost:9200',
                link: car.cid,
                with: space.did(),
              },
            }
          }),
        },
      })

      const server = createServer({
        id: await Signer.generate(),
        service,
        codec: CAR.inbound,
        validateAuthorization,
      })

      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: await mockServiceConf(server),
      })

      const space = await alice.createSpace('test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      const car = await randomCAR(128)
      const carCID = await alice.capability.store.add(car)

      assert(service.store.add.called)
      assert.equal(service.store.add.callCount, 1)

      assert.equal(carCID.toString(), car.cid.toString())
    })
  })

  describe('list', () => {
    it('should list stored CARs', async () => {
      const cursor = 'test'
      const page = {
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

      const service = mockService({
        store: {
          list: provide(StoreCapabilities.list, ({ invocation }) => {
            assert.equal(invocation.issuer.did(), alice.agent.did())
            assert.equal(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.equal(invCap.can, StoreCapabilities.list.can)
            assert.equal(invCap.with, alice.currentSpace()?.did())
            return { ok: page }
          }),
        },
      })

      const server = createServer({
        id: await Signer.generate(),
        service,
        codec: CAR.inbound,
        validateAuthorization,
      })

      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: await mockServiceConf(server),
      })

      const space = await alice.createSpace('test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      const res = await alice.capability.store.list()

      assert(service.store.list.called)
      assert.equal(service.store.list.callCount, 1)

      assert.equal(res.cursor, cursor)
      assert.equal(
        res.results[0].link.toString(),
        page.results[0].link.toString()
      )
    })
  })

  describe('remove', () => {
    it('should remove a stored CAR', async () => {
      const service = mockService({
        store: {
          remove: provide(StoreCapabilities.remove, ({ invocation }) => {
            assert.equal(invocation.issuer.did(), alice.agent.did())
            assert.equal(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.equal(invCap.can, StoreCapabilities.remove.can)
            assert.equal(invCap.with, alice.currentSpace()?.did())
            return { ok: { size: 128 } }
          }),
        },
      })

      const server = createServer({
        id: await Signer.generate(),
        service,
        codec: CAR.inbound,
        validateAuthorization,
      })

      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: await mockServiceConf(server),
      })

      const space = await alice.createSpace('test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      await alice.capability.store.remove((await randomCAR(128)).cid)

      assert(service.store.remove.called)
      assert.equal(service.store.remove.callCount, 1)
    })
  })

  describe('get', () => {
    it('should get a stored item', async () => {
      const car = await randomCAR(128)

      const service = mockService({
        store: {
          get: provide(StoreCapabilities.get, ({ invocation, capability }) => {
            assert.equal(invocation.issuer.did(), alice.agent.did())
            assert.equal(invocation.capabilities.length, 1)
            assert.equal(capability.can, StoreCapabilities.get.can)
            assert.equal(capability.with, alice.currentSpace()?.did())
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

      const server = createServer({
        id: await Signer.generate(),
        service,
        codec: CAR.inbound,
        validateAuthorization,
      })

      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: await mockServiceConf(server),
      })

      const space = await alice.createSpace('test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      const result = await alice.capability.store.get(car.cid)

      assert(service.store.get.called)
      assert.equal(service.store.get.callCount, 1)

      assert.equal(result.link.toString(), car.cid.toString())
      assert.equal(result.size, car.size)
    })
  })
})

import assert from 'assert'
import { create as createServer, provide } from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Signer from '@ucanto/principal/ed25519'
import { Store as StoreCapabilities } from '@web3-storage/capabilities'
import { AgentData } from '@web3-storage/access/agent'
import { randomCAR } from '../helpers/random.js'
import { mockService, mockServiceConf } from '../helpers/mocks.js'
import { Client } from '../../src/client.js'

describe('StoreClient', () => {
  describe('add', () => {
    it('should store a CAR file', async () => {
      const service = mockService({
        store: {
          add: provide(StoreCapabilities.add, ({ invocation }) => {
            assert.equal(invocation.issuer.did(), alice.agent().did())
            assert.equal(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.equal(invCap.can, StoreCapabilities.add.can)
            assert.equal(invCap.with, alice.currentSpace()?.did())
            return {
              status: 'upload',
              headers: { 'x-test': 'true' },
              url: 'http://localhost:9200'
            }
          })
        }
      })

      const server = createServer({
        id: await Signer.generate(),
        service,
        decoder: CAR,
        encoder: CBOR
      })

      const alice = new Client(
        await AgentData.create(),
        { serviceConf: await mockServiceConf(server) }
      )

      const space = await alice.createSpace()
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
            size: 123
          }
        ]
      }

      const service = mockService({
        store: {
          list: provide(StoreCapabilities.list, ({ invocation }) => {
            assert.equal(invocation.issuer.did(), alice.agent().did())
            assert.equal(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.equal(invCap.can, StoreCapabilities.list.can)
            assert.equal(invCap.with, alice.currentSpace()?.did())
            return page
          })
        }
      })

      const server = createServer({
        id: await Signer.generate(),
        service,
        decoder: CAR,
        encoder: CBOR
      })

      const alice = new Client(
        await AgentData.create(),
        { serviceConf: await mockServiceConf(server) }
      )

      const space = await alice.createSpace()
      await alice.setCurrentSpace(space.did())

      const res = await alice.capability.store.list()

      assert(service.store.list.called)
      assert.equal(service.store.list.callCount, 1)

      assert.equal(res.cursor, cursor)
      assert.equal(res.results[0].link.toString(), page.results[0].link.toString())
    })
  })

  describe('remove', () => {
    it('should remove a stored CAR', async () => {
      const service = mockService({
        store: {
          remove: provide(StoreCapabilities.remove, ({ invocation }) => {
            assert.equal(invocation.issuer.did(), alice.agent().did())
            assert.equal(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.equal(invCap.can, StoreCapabilities.remove.can)
            assert.equal(invCap.with, alice.currentSpace()?.did())
            return null
          })
        }
      })

      const server = createServer({
        id: await Signer.generate(),
        service,
        decoder: CAR,
        encoder: CBOR
      })

      const alice = new Client(
        await AgentData.create(),
        { serviceConf: await mockServiceConf(server) }
      )

      const space = await alice.createSpace()
      await alice.setCurrentSpace(space.did())

      await alice.capability.store.remove((await randomCAR(128)).cid)

      assert(service.store.remove.called)
      assert.equal(service.store.remove.callCount, 1)
    })
  })
})

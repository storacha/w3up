import assert from 'assert'
import { create as createServer, provide } from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Signer from '@ucanto/principal/ed25519'
import { Upload as UploadCapabilities } from '@web3-storage/capabilities'
import { AgentData } from '@web3-storage/access/agent'
import { randomCAR } from '../helpers/random.js'
import { mockService, mockServiceConf } from '../helpers/mocks.js'
import { Client } from '../../src/client.js'

describe('StoreClient', () => {
  describe('add', () => {
    it('should register an upload', async () => {
      const car = await randomCAR(128)

      const res = {
        root: car.roots[0],
        shards: [car.cid]
      }

      const service = mockService({
        upload: {
          add: provide(UploadCapabilities.add, ({ invocation }) => {
            assert.equal(invocation.issuer.did(), alice.agent().did())
            assert.equal(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.equal(invCap.can, UploadCapabilities.add.can)
            assert.equal(invCap.with, alice.currentSpace()?.did())
            assert.equal(String(invCap.nb?.root), car.roots[0].toString())
            assert.equal(invCap.nb?.shards?.length, 1)
            assert.equal(String(invCap.nb?.shards?.[0]), car.cid.toString())
            return res
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

      await alice.capability.upload.add(car.roots[0], [car.cid])

      assert(service.upload.add.called)
      assert.equal(service.upload.add.callCount, 1)
    })
  })

  describe('list', () => {
    it('should list uploads', async () => {
      const car = await randomCAR(128)
      const cursor = 'test'
      const page = {
        cursor,
        size: 1,
        results: [
          {
            root: car.roots[0],
            shards: [car.cid]
          }
        ]
      }

      const service = mockService({
        upload: {
          list: provide(UploadCapabilities.list, ({ invocation }) => {
            assert.equal(invocation.issuer.did(), alice.agent().did())
            assert.equal(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.equal(invCap.can, UploadCapabilities.list.can)
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

      const res = await alice.capability.upload.list()

      assert(service.upload.list.called)
      assert.equal(service.upload.list.callCount, 1)

      assert.equal(res.cursor, cursor)
      assert.equal(res.results[0].root.toString(), page.results[0].root.toString())
    })
  })

  describe('remove', () => {
    it('should remove an upload', async () => {
      const service = mockService({
        upload: {
          remove: provide(UploadCapabilities.remove, ({ invocation }) => {
            assert.equal(invocation.issuer.did(), alice.agent().did())
            assert.equal(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.equal(invCap.can, UploadCapabilities.remove.can)
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

      await alice.capability.upload.remove((await randomCAR(128)).roots[0])

      assert(service.upload.remove.called)
      assert.equal(service.upload.remove.callCount, 1)
    })
  })
})

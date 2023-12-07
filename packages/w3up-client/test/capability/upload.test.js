import assert from 'assert'
import { create as createServer, provide } from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as Signer from '@ucanto/principal/ed25519'
import { Upload as UploadCapabilities } from '@web3-storage/capabilities'
import { AgentData } from '@web3-storage/access/agent'
import { randomCAR } from '../helpers/random.js'
import { mockService, mockServiceConf } from '../helpers/mocks.js'
import { Client } from '../../src/client.js'
import { validateAuthorization } from '../helpers/utils.js'

describe('UploadClient', () => {
  describe('add', () => {
    it('should register an upload', async () => {
      const car = await randomCAR(128)

      const res = {
        root: car.roots[0],
        shards: [car.cid],
      }

      const service = mockService({
        upload: {
          add: provide(UploadCapabilities.add, ({ invocation }) => {
            assert.equal(invocation.issuer.did(), alice.agent.did())
            assert.equal(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.equal(invCap.can, UploadCapabilities.add.can)
            assert.equal(invCap.with, alice.currentSpace()?.did())
            assert.equal(String(invCap.nb?.root), car.roots[0].toString())
            assert.equal(invCap.nb?.shards?.length, 1)
            assert.equal(String(invCap.nb?.shards?.[0]), car.cid.toString())
            return { ok: res }
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
            shards: [car.cid],
            insertedAt: '1970-01-01T00:00:00.000Z',
            updatedAt: '1970-01-01T00:00:00.000Z',
          },
        ],
      }

      const service = mockService({
        upload: {
          list: provide(UploadCapabilities.list, ({ invocation }) => {
            assert.equal(invocation.issuer.did(), alice.agent.did())
            assert.equal(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.equal(invCap.can, UploadCapabilities.list.can)
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

      const res = await alice.capability.upload.list()

      assert(service.upload.list.called)
      assert.equal(service.upload.list.callCount, 1)

      assert.equal(res.cursor, cursor)
      assert.equal(
        res.results[0].root.toString(),
        page.results[0].root.toString()
      )
    })
  })

  describe('remove', () => {
    it('should remove an upload', async () => {
      const car = await randomCAR(128)

      const service = mockService({
        upload: {
          remove: provide(UploadCapabilities.remove, ({ invocation }) => {
            assert.equal(invocation.issuer.did(), alice.agent.did())
            assert.equal(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.equal(invCap.can, UploadCapabilities.remove.can)
            assert.equal(invCap.with, alice.currentSpace()?.did())
            return {
              ok: {
                root: car.roots[0],
                shards: [car.cid],
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

      await alice.capability.upload.remove(car.roots[0])

      assert(service.upload.remove.called)
      assert.equal(service.upload.remove.callCount, 1)
    })
  })

  describe('get', () => {
    it('should get an upload', async () => {
      const car = await randomCAR(128)

      const service = mockService({
        upload: {
          get: provide(UploadCapabilities.get, ({ invocation, capability }) => {
            assert.equal(invocation.issuer.did(), alice.agent.did())
            assert.equal(invocation.capabilities.length, 1)
            assert.equal(capability.can, UploadCapabilities.get.can)
            assert.equal(capability.with, alice.currentSpace()?.did())
            return {
              ok: {
                root: car.roots[0],
                shards: [car.cid],
                insertedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
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

      const result = await alice.capability.upload.get(car.cid)

      assert(service.upload.get.called)
      assert.equal(service.upload.get.callCount, 1)

      assert.equal(result.root.toString(), car.roots[0].toString())
      assert.equal(result.shards?.[0].toString(), car.cid)
    })
  })
})

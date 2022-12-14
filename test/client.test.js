import assert from 'assert'
import { create as createServer, provide } from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Signer from '@ucanto/principal/ed25519'
import * as StoreCapabilities from '@web3-storage/capabilities/store'
import * as UploadCapabilities from '@web3-storage/capabilities/upload'
import { AgentData } from '@web3-storage/access/agent'
import { randomBytes } from './helpers/random.js'
import { toCAR } from './helpers/car.js'
import { mockService, mockServiceConf } from './helpers/mocks.js'
import { File } from './helpers/shims.js'
import { Client } from '../src/client.js'

describe('Client', () => {
  describe('uploadFile', () => {
    it('should upload a file to the service', async () => {
      const bytes = await randomBytes(128)
      const file = new Blob([bytes])
      const expectedCar = await toCAR(bytes)

      /** @type {import('@web3-storage/upload-client/types').CARLink|undefined} */
      let carCID

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
        },
        upload: {
          add: provide(UploadCapabilities.add, ({ invocation }) => {
            assert.equal(invocation.issuer.did(), alice.agent().did())
            assert.equal(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.equal(invCap.can, UploadCapabilities.add.can)
            assert.equal(invCap.with, alice.currentSpace()?.did())
            assert.equal(invCap.nb?.shards?.length, 1)
            assert.equal(String(invCap.nb?.shards?.[0]), carCID?.toString())
            return {
              root: expectedCar.roots[0],
              shards: [expectedCar.cid]
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

      const dataCID = await alice.uploadFile(file, {
        onShardStored: meta => { carCID = meta.cid }
      })

      assert(service.store.add.called)
      assert.equal(service.store.add.callCount, 1)
      assert(service.upload.add.called)
      assert.equal(service.upload.add.callCount, 1)

      assert.equal(carCID?.toString(), expectedCar.cid.toString())
      assert.equal(dataCID.toString(), expectedCar.roots[0].toString())
    })

    it('should not allow upload without a current space', async () => {
      const alice = new Client(await AgentData.create())

      const bytes = await randomBytes(128)
      const file = new Blob([bytes])

      await assert.rejects(alice.uploadFile(file), { message: 'missing current space: use createSpace() or setCurrentSpace()' })
    })
  })

  describe('uploadDirectory', () => {
    it('should upload a directory to the service', async () => {
      const files = [
        new File([await randomBytes(128)], '1.txt'),
        new File([await randomBytes(32)], '2.txt')
      ]

      /** @type {import('@web3-storage/upload-client/types').CARLink|undefined} */
      let carCID

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
        },
        upload: {
          add: provide(UploadCapabilities.add, ({ invocation }) => {
            assert.equal(invocation.issuer.did(), alice.agent().did())
            assert.equal(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.equal(invCap.can, UploadCapabilities.add.can)
            assert.equal(invCap.with, alice.currentSpace()?.did())
            assert.equal(invCap.nb?.shards?.length, 1)
            if (!invCap.nb) throw new Error('nb must be present')
            return invCap.nb
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

      const dataCID = await alice.uploadDirectory(files, {
        onShardStored: meta => { carCID = meta.cid }
      })

      assert(service.store.add.called)
      assert.equal(service.store.add.callCount, 1)
      assert(service.upload.add.called)
      assert.equal(service.upload.add.callCount, 1)

      assert(carCID)
      assert(dataCID)
    })
  })

  describe('currentSpace', () => {
    it('should return undefined or space', async () => {
      const alice = new Client(await AgentData.create())

      const current0 = alice.currentSpace()
      assert(current0 == null)

      const space = await alice.createSpace()
      await alice.setCurrentSpace(space.did())

      const current1 = alice.currentSpace()
      assert(current1)
      assert.equal(current1.did(), space.did())
    })
  })

  describe('spaces', () => {
    it('should get agent spaces', async () => {
      const alice = new Client(await AgentData.create())

      const name = `space-${Date.now()}`
      const space = await alice.createSpace(name)

      const spaces = alice.spaces()
      assert.equal(spaces.length, 1)
      assert.equal(spaces[0].did(), space.did())
      assert.equal(spaces[0].name(), name)
    })

    it('should add space', async () => {
      const alice = new Client(await AgentData.create())
      const bob = new Client(await AgentData.create())

      const space = await alice.createSpace()
      await alice.setCurrentSpace(space.did())

      const delegation = await alice.createDelegation(bob.agent(), ['*'])

      assert.equal(bob.spaces().length, 0)
      await bob.addSpace(delegation)
      assert.equal(bob.spaces().length, 1)

      const spaces = bob.spaces()
      assert.equal(spaces.length, 1)
      assert.equal(spaces[0].did(), space.did())
    })
  })

  describe('proofs', () => {
    it('should get proofs', async () => {
      const alice = new Client(await AgentData.create())
      const bob = new Client(await AgentData.create())

      const space = await alice.createSpace()
      await alice.setCurrentSpace(space.did())

      const delegation = await alice.createDelegation(bob.agent(), ['*'])

      await bob.addProof(delegation)

      const proofs = bob.proofs()
      assert.equal(proofs.length, 1)
      assert.equal(proofs[0].cid.toString(), delegation.cid.toString())
    })
  })

  describe('delegations', () => {
    it('should get delegations', async () => {
      const alice = new Client(await AgentData.create())
      const bob = new Client(await AgentData.create())

      const space = await alice.createSpace()
      await alice.setCurrentSpace(space.did())
      const name = `delegation-${Date.now()}`
      const delegation = await alice.createDelegation(bob.agent(), ['*'], {
        audienceMeta: { type: 'device', name }
      })

      const delegations = alice.delegations()
      assert.equal(delegations.length, 1)
      assert.equal(delegations[0].cid.toString(), delegation.cid.toString())
      assert.equal(delegations[0].meta()?.audience?.name, name)
    })
  })
})

import assert from 'assert'
import {
  Delegation,
  create as createServer,
  parseLink,
  provide,
  error,
} from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as Signer from '@ucanto/principal/ed25519'
import * as StoreCapabilities from '@web3-storage/capabilities/store'
import * as UploadCapabilities from '@web3-storage/capabilities/upload'
import * as UCANCapabilities from '@web3-storage/capabilities/ucan'
import { AgentData } from '@web3-storage/access/agent'
import { StoreItemNotFound } from '../../upload-api/src/store/lib.js'
import { randomBytes, randomCAR } from './helpers/random.js'
import { toCAR } from './helpers/car.js'
import { mockService, mockServiceConf } from './helpers/mocks.js'
import { File } from './helpers/shims.js'
import { Client } from '../src/client.js'
import { validateAuthorization } from './helpers/utils.js'

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
          add: provide(StoreCapabilities.add, ({ invocation, capability }) => {
            assert.equal(invocation.issuer.did(), alice.agent.did())
            assert.equal(invocation.capabilities.length, 1)
            assert.equal(capability.can, StoreCapabilities.add.can)
            assert.equal(capability.with, alice.currentSpace()?.did())

            return {
              ok: {
                status: 'upload',
                headers: { 'x-test': 'true' },
                url: 'http://localhost:9200',
                link: /** @type {import('@web3-storage/upload-client/types').CARLink} */ (
                  invocation.capabilities[0].nb?.link
                ),
                with: space.did(),
                allocated: capability.nb.size,
              },
            }
          }),
        },
        upload: {
          add: provide(UploadCapabilities.add, ({ invocation }) => {
            assert.equal(invocation.issuer.did(), alice.agent.did())
            assert.equal(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.equal(invCap.can, UploadCapabilities.add.can)
            assert.equal(invCap.with, alice.currentSpace()?.did())
            assert.equal(invCap.nb?.shards?.length, 1)
            assert.equal(String(invCap.nb?.shards?.[0]), carCID?.toString())
            return {
              ok: {
                root: expectedCar.roots[0],
                shards: [expectedCar.cid],
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

      const space = await alice.createSpace('upload-test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      const dataCID = await alice.uploadFile(file, {
        onShardStored: (meta) => {
          carCID = meta.cid
        },
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

      await assert.rejects(alice.uploadFile(file), {
        message:
          'missing current space: use createSpace() or setCurrentSpace()',
      })
    })
  })

  describe('uploadDirectory', () => {
    it('should upload a directory to the service', async () => {
      const files = [
        new File([await randomBytes(128)], '1.txt'),
        new File([await randomBytes(32)], '2.txt'),
      ]

      /** @type {import('@web3-storage/upload-client/types').CARLink|undefined} */
      let carCID

      const service = mockService({
        store: {
          add: provide(StoreCapabilities.add, ({ invocation, capability }) => {
            assert.equal(invocation.issuer.did(), alice.agent.did())
            assert.equal(invocation.capabilities.length, 1)
            assert.equal(capability.can, StoreCapabilities.add.can)
            assert.equal(capability.with, alice.currentSpace()?.did())
            return {
              ok: {
                status: 'upload',
                headers: { 'x-test': 'true' },
                url: 'http://localhost:9200',
                link: /** @type {import('@web3-storage/upload-client/types').CARLink} */ (
                  invocation.capabilities[0].nb?.link
                ),
                with: space.did(),
                allocated: capability.nb.size,
              },
            }
          }),
        },
        upload: {
          add: provide(UploadCapabilities.add, ({ invocation }) => {
            assert.equal(invocation.issuer.did(), alice.agent.did())
            assert.equal(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.equal(invCap.can, UploadCapabilities.add.can)
            assert.equal(invCap.with, alice.currentSpace()?.did())
            assert.equal(invCap.nb?.shards?.length, 1)
            if (!invCap.nb) throw new Error('nb must be present')
            return {
              ok: invCap.nb,
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

      const space = await alice.createSpace('upload-dir-test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)

      await alice.setCurrentSpace(space.did())

      const dataCID = await alice.uploadDirectory(files, {
        onShardStored: (meta) => {
          carCID = meta.cid
        },
      })

      assert(service.store.add.called)
      assert.equal(service.store.add.callCount, 1)
      assert(service.upload.add.called)
      assert.equal(service.upload.add.callCount, 1)

      assert(carCID)
      assert(dataCID)
    })
  })

  describe('uploadCAR', () => {
    it('uploads a CAR file to the service', async () => {
      const car = await randomCAR(32)

      /** @type {import('../src/types.js').CARLink?} */
      let carCID

      const service = mockService({
        store: {
          add: provide(StoreCapabilities.add, ({ invocation, capability }) => {
            assert.equal(invocation.issuer.did(), alice.agent.did())
            assert.equal(invocation.capabilities.length, 1)
            assert.equal(capability.can, StoreCapabilities.add.can)
            assert.equal(capability.with, space.did())
            return {
              ok: {
                status: 'upload',
                headers: { 'x-test': 'true' },
                url: 'http://localhost:9200',
                link: /** @type {import('@web3-storage/upload-client/types').CARLink} */ (
                  invocation.capabilities[0].nb?.link
                ),
                with: space.did(),
                allocated: capability.nb.size,
              },
            }
          }),
        },
        upload: {
          add: provide(UploadCapabilities.add, ({ invocation }) => {
            assert.equal(invocation.issuer.did(), alice.agent.did())
            assert.equal(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.equal(invCap.can, UploadCapabilities.add.can)
            assert.equal(invCap.with, space.did())
            if (!invCap.nb) throw new Error('nb must be present')
            assert.equal(invCap.nb.shards?.length, 1)
            assert.ok(carCID)
            assert.equal(invCap.nb.shards?.[0].toString(), carCID.toString())
            return {
              ok: invCap.nb,
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

      const space = await alice.createSpace('car-space')
      await alice.addSpace(await space.createAuthorization(alice))
      await alice.setCurrentSpace(space.did())
      await alice.uploadCAR(car, {
        onShardStored: (meta) => {
          carCID = meta.cid
        },
      })

      assert(service.store.add.called)
      assert.equal(service.store.add.callCount, 1)
      assert(service.upload.add.called)
      assert.equal(service.upload.add.callCount, 1)
    })
  })

  describe('getReceipt', () => {
    it('should find a receipt', async () => {
      const taskCid = parseLink(
        'bafyreibo6nqtvp67daj7dkmeb5c2n6bg5bunxdmxq3lghtp3pmjtzpzfma'
      )
      const alice = new Client(await AgentData.create(), {
        receiptsEndpoint: new URL('http://localhost:9201'),
      })
      const receipt = await alice.getReceipt(taskCid)
      // This is a real `piece/accept` receipt exported as fixture
      assert(receipt)
      assert.ok(receipt.ran.link().equals(taskCid))
      assert.ok(receipt.out.ok)
    })
  })

  describe('currentSpace', () => {
    it('should return undefined or space', async () => {
      const alice = new Client(await AgentData.create())

      const current0 = alice.currentSpace()
      assert(current0 === undefined)

      const space = await alice.createSpace('new-space')
      await alice.addSpace(await space.createAuthorization(alice))
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
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)

      const spaces = alice.spaces()
      assert.equal(spaces.length, 1)
      assert.equal(spaces[0].did(), space.did())
      assert.equal(spaces[0].name, name)
    })

    it('should add space', async () => {
      const alice = new Client(await AgentData.create())
      const bob = new Client(await AgentData.create())

      const space = await alice.createSpace('new-space')
      await alice.addSpace(
        await space.createAuthorization(alice, {
          access: { '*': {} },
          expiration: Infinity,
        })
      )
      await alice.setCurrentSpace(space.did())

      const delegation = await alice.createDelegation(bob.agent, ['*'])

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

      const space = await alice.createSpace('proof-space')
      await alice.addSpace(await space.createAuthorization(alice))
      await alice.setCurrentSpace(space.did())

      const delegation = await alice.createDelegation(bob.agent, ['store/*'])

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

      const space = await alice.createSpace('test')
      await alice.addSpace(await space.createAuthorization(alice))
      await alice.setCurrentSpace(space.did())
      const name = `delegation-${Date.now()}`
      const delegation = await alice.createDelegation(
        bob.agent,
        ['upload/*', 'store/*'],
        {
          audienceMeta: { type: 'device', name },
        }
      )

      const delegations = alice.delegations()
      assert.equal(delegations.length, 1)
      assert.equal(delegations[0].cid.toString(), delegation.cid.toString())
      assert.equal(delegations[0].meta()?.audience?.name, name)
    })
  })

  describe('revokeDelegation', () => {
    it('should revoke a delegation by CID', async () => {
      const service = mockService({
        ucan: {
          revoke: provide(
            UCANCapabilities.revoke,
            ({ capability, invocation }) => {
              // copy a bit of the production revocation handler to do basic validation
              const { nb: input } = capability
              const ucan = Delegation.view(
                { root: input.ucan, blocks: invocation.blocks },
                null
              )
              return ucan
                ? { ok: { time: Date.now() } }
                : {
                    error: {
                      name: 'UCANNotFound',
                      message: 'Could not find delegation in invocation blocks',
                    },
                  }
            }
          ),
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
      const bob = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: await mockServiceConf(server),
      })

      const space = await alice.createSpace('test')
      await alice.addSpace(
        await space.createAuthorization(alice, {
          access: { '*': {} },
        })
      )
      await alice.setCurrentSpace(space.did())
      const name = `delegation-${Date.now()}`
      const delegation = await alice.createDelegation(bob.agent, ['*'], {
        audienceMeta: { type: 'device', name },
      })

      const result = await alice.revokeDelegation(delegation.cid)
      assert.ok(result.ok)
    })

    it('should fail to revoke a delegation it does not know about', async () => {
      const alice = new Client(await AgentData.create())
      const bob = new Client(await AgentData.create())

      const space = await alice.createSpace('test')
      await alice.addSpace(await space.createAuthorization(alice))
      await alice.setCurrentSpace(space.did())
      const name = `delegation-${Date.now()}`
      const delegation = await alice.createDelegation(bob.agent, ['space/*'], {
        audienceMeta: { type: 'device', name },
      })

      const result = await bob.revokeDelegation(delegation.cid)
      assert.ok(result.error, 'revoke succeeded when it should not have')
    })
  })

  describe('defaultProvider', () => {
    it('should return the connection ID', async () => {
      const alice = new Client(await AgentData.create())
      assert.equal(alice.defaultProvider(), 'did:web:web3.storage')
    })
  })

  describe('capability', () => {
    it('should allow typed access to capability specific clients', async () => {
      const client = new Client(await AgentData.create())
      assert.equal(typeof client.capability.access.authorize, 'function')
      assert.equal(typeof client.capability.access.claim, 'function')
      assert.equal(typeof client.capability.space.info, 'function')
      assert.equal(typeof client.capability.store.add, 'function')
      assert.equal(typeof client.capability.store.list, 'function')
      assert.equal(typeof client.capability.store.remove, 'function')
      assert.equal(typeof client.capability.upload.add, 'function')
      assert.equal(typeof client.capability.upload.list, 'function')
      assert.equal(typeof client.capability.upload.remove, 'function')
    })
  })

  describe('remove', () => {
    it('should remove an uploaded file from the service with its shards', async () => {
      const bytes = await randomBytes(128)
      const uploadedCar = await toCAR(bytes)
      const contentCID = uploadedCar.roots[0]

      const service = mockService({
        store: {
          remove: provide(StoreCapabilities.remove, ({ invocation }) => {
            return { ok: { size: uploadedCar.size } }
          }),
        },
        upload: {
          get: provide(UploadCapabilities.get, ({ invocation }) => {
            return {
              ok: {
                root: uploadedCar.roots[0],
                shards: [uploadedCar.cid],
                insertedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            }
          }),
          remove: provide(UploadCapabilities.remove, ({ invocation }) => {
            return {
              ok: {
                root: uploadedCar.roots[0],
                shards: [uploadedCar.cid],
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

      // setup space
      const space = await alice.createSpace('upload-test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      await assert.doesNotReject(() =>
        alice.remove(contentCID, { shards: true })
      )

      assert(service.upload.get.called)
      assert.equal(service.upload.get.callCount, 1)
      assert(service.upload.remove.called)
      assert.equal(service.upload.remove.callCount, 1)
      assert(service.store.remove.called)
      assert.equal(service.store.remove.callCount, 1)
    })

    it('should remove an uploaded file from the service without its shards by default', async () => {
      const bytes = await randomBytes(128)
      const uploadedCar = await toCAR(bytes)
      const contentCID = uploadedCar.roots[0]

      const service = mockService({
        upload: {
          get: provide(UploadCapabilities.get, ({ invocation }) => {
            return {
              ok: {
                root: uploadedCar.roots[0],
                shards: [uploadedCar.cid],
                insertedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            }
          }),
          remove: provide(UploadCapabilities.remove, ({ invocation }) => {
            return {
              ok: {
                root: uploadedCar.roots[0],
                shards: [uploadedCar.cid],
              },
            }
          }),
        },
        store: {
          remove: provide(StoreCapabilities.remove, ({ invocation }) => {
            return { ok: { size: uploadedCar.size } }
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

      // setup space
      const space = await alice.createSpace('upload-test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      await assert.doesNotReject(() => alice.remove(contentCID))

      assert(service.upload.remove.called)
      assert.equal(service.upload.remove.callCount, 1)
      assert.equal(service.store.remove.callCount, 0)
    })

    it('should fail to remove uploaded shards if upload is not found', async () => {
      const bytes = await randomBytes(128)
      const uploadedCar = await toCAR(bytes)
      const contentCID = uploadedCar.roots[0]

      const service = mockService({
        upload: {
          get: provide(UploadCapabilities.get, ({ invocation }) => {
            return error(new StoreItemNotFound('did:web:any', uploadedCar.cid))
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

      // setup space
      const space = await alice.createSpace('upload-test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      await assert.rejects(alice.remove(contentCID, { shards: true }))

      assert(service.upload.get.called)
      assert.equal(service.upload.get.callCount, 1)
      assert.equal(service.store.remove.callCount, 0)
      assert.equal(service.upload.remove.callCount, 0)
    })

    it('should not fail to remove if shard is not found', async () => {
      const bytesArray = [await randomBytes(128), await randomBytes(128)]
      const uploadedCars = await Promise.all(
        bytesArray.map((bytes) => toCAR(bytes))
      )
      const contentCID = uploadedCars[0].roots[0]

      const service = mockService({
        upload: {
          get: provide(UploadCapabilities.get, ({ invocation }) => {
            return {
              ok: {
                root: uploadedCars[0].roots[0],
                shards: uploadedCars.map((car) => car.cid),
                insertedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            }
          }),
          remove: provide(UploadCapabilities.remove, ({ invocation }) => {
            return {
              ok: {
                root: uploadedCars[0].roots[0],
                shards: uploadedCars.map((car) => car.cid),
              },
            }
          }),
        },
        store: {
          remove: provide(
            StoreCapabilities.remove,
            ({ invocation, capability }) => {
              // Fail for first as not found)
              if (capability.nb.link.equals(uploadedCars[0].cid)) {
                return error(
                  new StoreItemNotFound('did:web:any', uploadedCars[0].cid)
                )
              }
              return { ok: { size: uploadedCars[1].size } }
            }
          ),
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

      // setup space
      const space = await alice.createSpace('upload-test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      await assert.doesNotReject(() =>
        alice.remove(contentCID, { shards: true })
      )

      assert(service.upload.remove.called)
      assert.equal(service.upload.remove.callCount, 1)
      assert.equal(service.store.remove.callCount, 2)
    })

    it('should not allow remove without a current space', async () => {
      const alice = new Client(await AgentData.create())

      const bytes = await randomBytes(128)
      const uploadedCar = await toCAR(bytes)
      const contentCID = uploadedCar.roots[0]

      await assert.rejects(alice.remove(contentCID, { shards: true }))
    })
  })
})

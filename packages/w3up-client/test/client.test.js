import assert from 'assert'
import { parseLink } from '@ucanto/server'
import { AgentData } from '@web3-storage/access/agent'
import { randomBytes, randomCAR } from './helpers/random.js'
import { toCAR } from './helpers/car.js'
import { File } from './helpers/shims.js'
import { Client } from '../src/client.js'
import * as Test from './test.js'

/** @type {Test.Suite} */
export const testClient = {
  uploadFile: Test.withContext({
    'should upload a file to the service': async (
      assert,
      { connection, provisionsStorage, uploadTable, storeTable }
    ) => {
      const bytes = await randomBytes(128)
      const file = new Blob([bytes])
      const expectedCar = await toCAR(bytes)
      /** @type {import('@web3-storage/upload-client/types').CARLink|undefined} */
      let carCID

      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
      })

      const space = await alice.createSpace('upload-test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      // Then we setup a billing for this account
      await provisionsStorage.put({
        // @ts-expect-error
        provider: connection.id.did(),
        account: alice.agent.did(),
        consumer: space.did(),
      })

      const dataCID = await alice.uploadFile(file, {
        onShardStored: (meta) => {
          carCID = meta.cid
        },
      })

      assert.deepEqual(await uploadTable.exists(space.did(), dataCID), {
        ok: true,
      })

      assert.deepEqual(await storeTable.exists(space.did(), expectedCar.cid), {
        ok: true,
      })

      assert.equal(carCID?.toString(), expectedCar.cid.toString())
      assert.equal(dataCID.toString(), expectedCar.roots[0].toString())
    },

    'should not allow upload without a current space': async (
      assert,
      { connection }
    ) => {
      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
      })

      const bytes = await randomBytes(128)
      const file = new Blob([bytes])

      await assert.rejects(alice.uploadFile(file), {
        message:
          'missing current space: use createSpace() or setCurrentSpace()',
      })
    },
  }),

  uploadDirectory: Test.withContext({
    'should upload a directory to the service': async (
      assert,
      { connection, provisionsStorage, uploadTable }
    ) => {
      const bytesList = [await randomBytes(128), await randomBytes(32)]
      const files = bytesList.map(
        (bytes, index) => new File([bytes], `${index}.txt`)
      )

      /** @type {import('@web3-storage/upload-client/types').CARLink|undefined} */
      let carCID

      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
      })

      const space = await alice.createSpace('upload-dir-test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)

      await alice.setCurrentSpace(space.did())

      // Then we setup a billing for this account
      await provisionsStorage.put({
        // @ts-expect-error
        provider: connection.id.did(),
        account: alice.agent.did(),
        consumer: space.did(),
      })

      const dataCID = await alice.uploadDirectory(files, {
        onShardStored: (meta) => {
          carCID = meta.cid
        },
      })

      assert.deepEqual(await uploadTable.exists(space.did(), dataCID), {
        ok: true,
      })
      assert.ok(carCID)
      assert.ok(dataCID)
    },
  }),
  uploadCar: Test.withContext({
    'uploads a CAR file to the service': async (
      assert,
      { connection, provisionsStorage, uploadTable, storeTable }
    ) => {
      const car = await randomCAR(32)

      /** @type {import('../src/types.js').CARLink|null} */
      let carCID = null

      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
      })

      const space = await alice.createSpace('car-space')
      await alice.addSpace(await space.createAuthorization(alice))
      await alice.setCurrentSpace(space.did())

      // Then we setup a billing for this account
      await provisionsStorage.put({
        // @ts-expect-error
        provider: connection.id.did(),
        account: alice.agent.did(),
        consumer: space.did(),
      })

      const root = await alice.uploadCAR(car, {
        onShardStored: (meta) => {
          carCID = meta.cid
        },
      })

      assert.deepEqual(await uploadTable.exists(space.did(), root), {
        ok: true,
      })

      if (carCID == null) {
        return assert.ok(carCID)
      }

      assert.deepEqual(await storeTable.exists(space.did(), carCID), {
        ok: true,
      })
    },
  }),
  getRecipt: Test.withContext({
    'should find a receipt': async (assert, { connection }) => {
      const taskCid = parseLink(
        'bafyreibo6nqtvp67daj7dkmeb5c2n6bg5bunxdmxq3lghtp3pmjtzpzfma'
      )
      const alice = new Client(await AgentData.create(), {
        receiptsEndpoint: new URL('http://localhost:9201'),
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
      })
      const receipt = await alice.getReceipt(taskCid)
      // This is a real `piece/accept` receipt exported as fixture
      assert.ok(receipt)
      assert.ok(receipt?.ran.link().equals(taskCid))
      assert.ok(receipt?.out.ok)
    },
  }),
  currentSpace: {
    'should return undefined or space': async (assert) => {
      const alice = new Client(await AgentData.create())

      const current0 = alice.currentSpace()
      assert.equal(current0, undefined)

      const space = await alice.createSpace('new-space')
      await alice.addSpace(await space.createAuthorization(alice))
      await alice.setCurrentSpace(space.did())

      const current1 = alice.currentSpace()
      assert.ok(current1)
      assert.equal(current1?.did(), space.did())
    },
  },
  spaces: {
    'should get agent spaces': async (assert) => {
      const alice = new Client(await AgentData.create())

      const name = `space-${Date.now()}`
      const space = await alice.createSpace(name)
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)

      const spaces = alice.spaces()
      assert.equal(spaces.length, 1)
      assert.equal(spaces[0].did(), space.did())
      assert.equal(spaces[0].name, name)
    },

    'should add space': async () => {
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
    },
  },
  proofs: {
    'should get proofs': async (assert) => {
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
    },
  },
  delegations: {
    'should get delegations': async (assert) => {
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
    },
  },

  revokeDelegation: Test.withContext({
    'should revoke a delegation by CID': async (assert, { connection }) => {
      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
      })
      const bob = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
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
    },

    'should fail to revoke a delegation it does not know about': async (
      assert
    ) => {
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
    },
  }),
  defaultProvider: {
    'should return the connection ID': async (assert) => {
      const alice = new Client(await AgentData.create())
      assert.equal(alice.defaultProvider(), 'did:web:web3.storage')
    },
  },

  capability: {
    'should allow typed access to capability specific clients': async () => {
      const client = new Client(await AgentData.create())
      assert.equal(typeof client.capability.access.authorize, 'function')
      assert.equal(typeof client.capability.access.claim, 'function')
      assert.equal(typeof client.capability.space.info, 'function')
      assert.equal(typeof client.capability.blob.add, 'function')
      assert.equal(typeof client.capability.store.list, 'function')
      assert.equal(typeof client.capability.store.remove, 'function')
      assert.equal(typeof client.capability.upload.add, 'function')
      assert.equal(typeof client.capability.upload.list, 'function')
      assert.equal(typeof client.capability.upload.remove, 'function')
    },
  },

  remove: Test.withContext({
    'should remove an uploaded file from the service with its shards': async (
      assert,
      { connection, provisionsStorage, uploadTable }
    ) => {
      const bytes = await randomBytes(128)

      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
      })

      // setup space
      const space = await alice.createSpace('upload-test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      // Then we setup a billing for this account
      await provisionsStorage.put({
        // @ts-expect-error
        provider: connection.id.did(),
        account: alice.agent.did(),
        consumer: space.did(),
      })

      const root = await alice.uploadFile(new Blob([bytes]))

      assert.deepEqual(await uploadTable.exists(space.did(), root), {
        ok: true,
      })

      assert.deepEqual(
        await alice
          .remove(root, { shards: true })
          .then((ok) => ({ ok: {} }))
          .catch((error) => {
            error
          }),
        { ok: {} }
      )

      assert.deepEqual(await uploadTable.exists(space.did(), root), {
        ok: false,
      })
    },

    'should remove an uploaded file from the service without its shards by default':
      async (assert, { connection, provisionsStorage, uploadTable }) => {
        const bytes = await randomBytes(128)

        const alice = new Client(await AgentData.create(), {
          // @ts-ignore
          serviceConf: {
            access: connection,
            upload: connection,
          },
        })

        // setup space
        const space = await alice.createSpace('upload-test')
        const auth = await space.createAuthorization(alice)
        await alice.addSpace(auth)
        await alice.setCurrentSpace(space.did())

        // Then we setup a billing for this account
        await provisionsStorage.put({
          // @ts-expect-error
          provider: connection.id.did(),
          account: alice.agent.did(),
          consumer: space.did(),
        })

        const root = await alice.uploadFile(new Blob([bytes]))

        assert.deepEqual(await uploadTable.exists(space.did(), root), {
          ok: true,
        })

        assert.deepEqual(
          await alice
            .remove(root)
            .then((ok) => ({ ok: {} }))
            .catch((error) => {
              error
            }),
          { ok: {} }
        )

        assert.deepEqual(await uploadTable.exists(space.did(), root), {
          ok: false,
        })
      },

    'should fail to remove uploaded shards if upload is not found': async (
      assert,
      { connection }
    ) => {
      const bytes = await randomBytes(128)
      const uploadedCar = await toCAR(bytes)
      const contentCID = uploadedCar.roots[0]

      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
      })

      // setup space
      const space = await alice.createSpace('upload-test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      await assert.rejects(alice.remove(contentCID, { shards: true }))
    },

    'should not fail to remove if shard is not found': async (
      assert,
      { connection, provisionsStorage, uploadTable }
    ) => {
      const bytesArray = [await randomBytes(128), await randomBytes(128)]

      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
      })

      // setup space
      const space = await alice.createSpace('upload-test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      // Then we setup a billing for this account
      await provisionsStorage.put({
        // @ts-expect-error
        provider: connection.id.did(),
        account: alice.agent.did(),
        consumer: space.did(),
      })

      const root = await alice.uploadFile(new Blob(bytesArray))

      const upload = await uploadTable.get(space.did(), root)

      const shard = upload.ok?.shards?.[0]
      if (!shard) {
        return assert.ok(shard)
      }

      // delete shard
      assert.ok((await alice.capability.store.remove(shard)).ok)

      assert.deepEqual(
        await alice
          .remove(root, { shards: true })
          .then(() => ({ ok: {} }))
          .catch((error) => ({ error })),
        { ok: {} }
      )
    },

    'should not allow remove without a current space': async (assert) => {
      const alice = new Client(await AgentData.create())

      const bytes = await randomBytes(128)
      const uploadedCar = await toCAR(bytes)
      const contentCID = uploadedCar.roots[0]

      await assert.rejects(alice.remove(contentCID, { shards: true }))
    },
  }),
}

Test.test({ Client: testClient })

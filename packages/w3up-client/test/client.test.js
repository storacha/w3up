import assert from 'assert'
import { parseLink } from '@ucanto/server'
import {
  Agent,
  AgentData,
  claimAccess,
  requestAccess,
} from '@web3-storage/access/agent'
import { randomBytes, randomCAR } from './helpers/random.js'
import { toCAR } from './helpers/car.js'
import { File } from './helpers/shims.js'
import { Client } from '../src/client.js'
import * as Test from './test.js'
import { receiptsEndpoint } from './helpers/utils.js'
import { Absentee } from '@ucanto/principal'
import { DIDMailto } from '../src/capability/access.js'
import {
  confirmConfirmationUrl,
  w3,
} from '../../upload-api/test/helpers/utils.js'
import * as SpaceCapability from '@web3-storage/capabilities/space'

/** @type {Test.Suite} */
export const testClient = {
  uploadFile: Test.withContext({
    'should upload a file to the service': async (
      assert,
      { connection, provisionsStorage, uploadTable, allocationsStorage }
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
        receiptsEndpoint: new URL(receiptsEndpoint),
      })

      const space = await alice.createSpace('upload-test', {
        skipContentServeAuthorization: true,
      })
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

      assert.deepEqual(
        await allocationsStorage.exists(space.did(), expectedCar.cid.multihash),
        {
          ok: true,
        }
      )

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
        receiptsEndpoint: new URL(receiptsEndpoint),
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
        receiptsEndpoint: new URL(receiptsEndpoint),
      })

      const space = await alice.createSpace('upload-dir-test', {
        skipContentServeAuthorization: true,
      })
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
      { connection, provisionsStorage, uploadTable, allocationsStorage }
    ) => {
      const car = await randomCAR(32)

      let carCID = /** @type {import('../src/types.js').CARLink|null} */ (null)

      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
        receiptsEndpoint: new URL(receiptsEndpoint),
      })

      const space = await alice.createSpace('car-space', {
        skipContentServeAuthorization: true,
      })
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

      assert.deepEqual(
        await allocationsStorage.exists(space.did(), carCID.multihash),
        {
          ok: true,
        }
      )
    },
  }),
  getReceipt: Test.withContext({
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

      const space = await alice.createSpace('new-space', {
        skipContentServeAuthorization: true,
      })
      await alice.addSpace(await space.createAuthorization(alice))
      await alice.setCurrentSpace(space.did())

      const current1 = alice.currentSpace()
      assert.ok(current1)
      assert.equal(current1?.did(), space.did())
    },
  },
  spaces: Test.withContext({
    'should get agent spaces': async (assert) => {
      const alice = new Client(await AgentData.create())

      const name = `space-${Date.now()}`
      const space = await alice.createSpace(name, {
        skipContentServeAuthorization: true,
      })
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

      const space = await alice.createSpace('new-space', {
        skipContentServeAuthorization: true,
      })
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

    'should create a space with recovery account': async (
      assert,
      { client, mail, connect, grantAccess }
    ) => {
      // Step 1: Create a client for Alice and login
      const aliceEmail = 'alice@web.mail'
      const aliceLogin = client.login(aliceEmail)
      const message = await mail.take()
      assert.deepEqual(message.to, aliceEmail)
      await grantAccess(message)
      const aliceAccount = await aliceLogin

      // Step 2: Alice creates a space with her account as the recovery account
      const space = await client.createSpace('recovery-space-test', {
        account: aliceAccount, // The account is the recovery account
      })
      assert.ok(space)

      // Step 3: Verify the recovery account by connecting to a new device
      const secondClient = await connect()
      const secondLogin = secondClient.login(aliceEmail)
      const secondMessage = await mail.take()
      assert.deepEqual(secondMessage.to, aliceEmail)
      await grantAccess(secondMessage)
      const aliceAccount2 = await secondLogin
      await secondClient.addSpace(
        await space.createAuthorization(aliceAccount2)
      )
      await secondClient.setCurrentSpace(space.did())

      // Step 4: Verify the space is accessible from the new device
      const spaceInfo = await secondClient.capability.space.info(space.did())
      assert.ok(spaceInfo)
    },

    'should create a space without recovery account and fail access from another device':
      async (assert, { client, mail, connect, grantAccess }) => {
        // Step 1: Create a client for Alice and login
        const aliceEmail = 'alice@web.mail'
        const aliceLogin = client.login(aliceEmail)
        const message = await mail.take()
        assert.deepEqual(message.to, aliceEmail)
        await grantAccess(message)
        await aliceLogin

        // Step 2: Alice creates a space without providing a recovery account
        const space = await client.createSpace('no-recovery-space-test')
        assert.ok(space)

        // Step 3: Attempt to access the space from a new device
        const secondClient = await connect()
        const secondLogin = secondClient.login(aliceEmail)
        const secondMessage = await mail.take()
        assert.deepEqual(secondMessage.to, aliceEmail)
        await grantAccess(secondMessage)
        const aliceAccount2 = await secondLogin

        // Step 4: Add the space to the new device and set it as current space
        await secondClient.addSpace(
          await space.createAuthorization(aliceAccount2)
        )
        await secondClient.setCurrentSpace(space.did())

        // Step 5: Verify the space is accessible from the new device
        await assert.rejects(secondClient.capability.space.info(space.did()), {
          message: `no proofs available for resource ${space.did()} and ability space/info`,
        })
      },

    'should fail to create a space due to provisioning error': async (
      assert,
      { client, mail, grantAccess }
    ) => {
      // Step 1: Create a client for Alice and login
      const aliceEmail = 'alice@web.mail'
      const aliceLogin = client.login(aliceEmail)
      const message = await mail.take()
      assert.deepEqual(message.to, aliceEmail)
      await grantAccess(message)
      const aliceAccount = await aliceLogin

      // Step 2: Mock the provisioning to fail
      const originalProvision = aliceAccount.provision
      aliceAccount.provision = async () => ({
        error: { name: 'ProvisionError', message: 'Provisioning failed' },
      })

      // Step 3: Attempt to create a space with the account
      await assert.rejects(
        client.createSpace('provision-fail-space-test', {
          account: aliceAccount,
        }),
        {
          message: 'failed to provision account: Provisioning failed',
        }
      )

      // Restore the original provision method
      aliceAccount.provision = originalProvision
    },

    'should fail to create a space due to delegate access error': async (
      assert,
      { client, mail, connect, grantAccess }
    ) => {
      // Step 1: Create a client for Alice and login
      const aliceEmail = 'alice@web.mail'
      const aliceLogin = client.login(aliceEmail)
      const message = await mail.take()
      assert.deepEqual(message.to, aliceEmail)
      await grantAccess(message)
      const aliceAccount = await aliceLogin

      // Step 2: Mock the delegate access to fail
      const originalDelegate = client.capability.access.delegate
      client.capability.access.delegate = async () => ({
        error: { name: 'DelegateError', message: 'Delegation failed' },
      })

      // Step 3: Attempt to create a space with the account
      await assert.rejects(
        client.createSpace('delegate-fail-space-test', {
          account: aliceAccount,
        }),
        {
          message: 'failed to authorize recovery account: Delegation failed',
        }
      )

      // Restore the original delegate method
      client.capability.access.delegate = originalDelegate
    },
  }),
  shareSpace: Test.withContext({
    'should share the space with another account': async (
      assert,
      { client: aliceClient, mail, grantAccess, connection }
    ) => {
      // Step 1: Create a client for Alice and login
      const aliceEmail = 'alice@web.mail'
      const aliceLogin = aliceClient.login(aliceEmail)
      const message = await mail.take()
      assert.deepEqual(message.to, aliceEmail)
      await grantAccess(message)
      const aliceAccount = await aliceLogin

      // Step 2: Alice creates a space
      const space = await aliceClient.createSpace('share-space-test', {
        account: aliceAccount,
      })
      assert.ok(space)

      // Step 3: Alice shares the space with Bob
      const bobEmail = 'bob@web.mail'
      await aliceClient.shareSpace(bobEmail, space.did())

      // Step 4: Bob access his device and his device gets authorized
      const bobAccount = Absentee.from({ id: DIDMailto.fromEmail(bobEmail) })
      const bobAgentData = await AgentData.create()
      const bobClient = await Agent.create(bobAgentData, {
        connection,
      })

      // Authorization
      await requestAccess(bobClient, bobAccount, [{ can: '*' }])
      await confirmConfirmationUrl(bobClient.connection, await mail.take())

      // Step 5: Claim Access to the shared space
      await claimAccess(bobClient, bobClient.issuer.did(), {
        addProofs: true,
      })

      // Step 6: Bob verifies access to the space
      const spaceInfo = await bobClient.getSpaceInfo(space.did())
      assert.ok(spaceInfo)
      assert.equal(spaceInfo.did, space.did())

      // Step 7: The shared space should be part of Bob's spaces
      const spaces = bobClient.spaces
      assert.equal(spaces.size, 1)
      assert.equal(spaces.get(space.did())?.name, space.name)

      // Step 8: Make sure Alice and Bob's clients/devices are different
      assert.notEqual(aliceClient.did(), bobClient.did())
    },

    'should fail to share the space if the delegate call returns an error':
      async (assert, { client, mail, grantAccess }) => {
        // Step 1: Create a client for Alice and login
        const aliceEmail = 'alice@web.mail'
        const aliceLogin = client.login(aliceEmail)
        const message = await mail.take()
        assert.deepEqual(message.to, aliceEmail)
        await grantAccess(message)
        const aliceAccount = await aliceLogin

        // Step 2: Alice creates a space
        const space = await client.createSpace(
          'share-space-delegate-fail-test',
          {
            account: aliceAccount,
          }
        )
        assert.ok(space)

        // Step 3: Mock the delegate call to return an error
        const originalDelegate = client.capability.access.delegate
        // @ts-ignore
        client.capability.access.delegate = async () => {
          return { error: { message: 'Delegate failed' } }
        }

        // Step 4: Attempt to share the space with Bob and expect failure
        const bobEmail = 'bob@web.mail'
        await assert.rejects(client.shareSpace(bobEmail, space.did()), {
          message: `failed to share space with ${bobEmail}: Delegate failed`,
        })

        // Restore the original delegate method
        client.capability.access.delegate = originalDelegate
      },

    'should reset current space when sharing': async (
      assert,
      { client, mail, grantAccess }
    ) => {
      // Step 1: Create a client for Alice and login
      const aliceEmail = 'alice@web.mail'
      const aliceLogin = client.login(aliceEmail)
      const message = await mail.take()
      assert.deepEqual(message.to, aliceEmail)
      await grantAccess(message)
      const aliceAccount = await aliceLogin

      // Step 2: Alice creates a space
      const spaceA = await client.createSpace('test-space-a', {
        account: aliceAccount,
      })
      assert.ok(spaceA)

      // Step 3: Alice creates another space to share with a friend
      const spaceB = await client.createSpace('test-space-b', {
        account: aliceAccount,
      })
      assert.ok(spaceB)

      // Step 4: Alice set the current space to space A and shares the space B with Bob
      await client.setCurrentSpace(spaceA.did())
      await client.shareSpace('bob@web.mail', spaceB.did())

      // Step 5: Check that current space from Alice is still space A
      const currentSpace = client.currentSpace()
      assert.equal(
        currentSpace?.did(),
        spaceA.did(),
        'current space is not space A'
      )
    },
  }),
  authorizeGateway: Test.withContext({
    'should authorize a gateway to serve content from a space': async (
      assert,
      { client, mail, grantAccess, connection }
    ) => {
      // Step 1: Create a client for Alice and login
      const aliceEmail = 'alice@web.mail'
      const aliceLogin = client.login(aliceEmail)
      const message = await mail.take()
      assert.deepEqual(message.to, aliceEmail)
      await grantAccess(message)
      const aliceAccount = await aliceLogin

      // Step 2: Alice creates a space
      const spaceA = await client.createSpace('authorize-gateway-space', {
        account: aliceAccount,
      })
      assert.ok(spaceA)
      await client.setCurrentSpace(spaceA.did())

      // Step 3: Authorize the gateway to serve content from the space
      const delegationResult = await client.authorizeContentServe(spaceA, {
        audience: w3.did(),
        connection: connection,
      })
      assert.ok(delegationResult.ok)
      const { delegation } = delegationResult.ok

      // Step 4: Find the delegation for the default gateway
      assert.equal(delegation.audience.did(), 'did:web:staging.w3s.link')
      assert.ok(
        delegation.capabilities.some(
          (c) =>
            c.can === SpaceCapability.contentServe.can &&
            c.with === spaceA.did()
        )
      )
    },
  }),
  proofs: {
    'should get proofs': async (assert) => {
      const alice = new Client(await AgentData.create())
      const bob = new Client(await AgentData.create())

      const space = await alice.createSpace('proof-space', {
        skipContentServeAuthorization: true,
      })
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

      const space = await alice.createSpace('test', {
        skipContentServeAuthorization: true,
      })
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

      const space = await alice.createSpace('test', {
        skipContentServeAuthorization: true,
      })
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

      const space = await alice.createSpace('test', {
        skipContentServeAuthorization: true,
      })
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
      assert.equal(typeof client.capability.blob.list, 'function')
      assert.equal(typeof client.capability.blob.remove, 'function')
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
        receiptsEndpoint: new URL(receiptsEndpoint),
      })

      // setup space
      const space = await alice.createSpace('upload-test', {
        skipContentServeAuthorization: true,
      })
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

      const content = new Blob([bytes])
      const fileLink = await alice.uploadFile(content)

      assert.deepEqual(await uploadTable.exists(space.did(), fileLink), {
        ok: true,
      })

      assert.deepEqual(
        await alice
          .remove(fileLink, { shards: true })
          .then((ok) => ({ ok: {} }))
          .catch((error) => {
            error
          }),
        { ok: {} }
      )

      assert.deepEqual(await uploadTable.exists(space.did(), fileLink), {
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
          receiptsEndpoint: new URL(receiptsEndpoint),
        })

        // setup space
        const space = await alice.createSpace('upload-test', {
          skipContentServeAuthorization: true,
        })
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

        const content = new Blob([bytes])
        const fileLink = await alice.uploadFile(content)

        assert.deepEqual(await uploadTable.exists(space.did(), fileLink), {
          ok: true,
        })

        assert.deepEqual(
          await alice
            .remove(fileLink)
            .then((ok) => ({ ok: {} }))
            .catch((error) => {
              error
            }),
          { ok: {} }
        )

        assert.deepEqual(await uploadTable.exists(space.did(), fileLink), {
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
      const space = await alice.createSpace('upload-test', {
        skipContentServeAuthorization: true,
      })
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
        receiptsEndpoint: new URL(receiptsEndpoint),
      })

      // setup space
      const space = await alice.createSpace('upload-test', {
        skipContentServeAuthorization: true,
      })
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

      const content = new Blob(bytesArray)
      const fileLink = await alice.uploadFile(content)

      const upload = await uploadTable.get(space.did(), fileLink)

      const shard = upload.ok?.shards?.[0]
      if (!shard) {
        return assert.ok(shard)
      }

      // delete shard
      assert.ok((await alice.capability.blob.remove(shard.multihash)).ok)

      assert.deepEqual(
        await alice
          .remove(fileLink, { shards: true })
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

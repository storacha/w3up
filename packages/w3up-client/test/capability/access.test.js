import { AgentData } from '@storacha/access/agent'
import { Client } from '../../src/client.js'
import * as Upload from '@storacha/capabilities/upload'
import * as Test from '../test.js'

export const AccessClient = Test.withContext({
  claim: {
    'should claim delegations': async (assert, { connection }) => {
      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
      })

      const delegations = await alice.capability.access.claim()

      assert.deepEqual(delegations, [])
    },
    'should delegate and then claim': async (
      assert,
      { id: w3, connection, provisionsStorage }
    ) => {
      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
      })

      const space = await alice.createSpace('upload-test', {
        skipGatewayAuthorization: true,
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

      const bob = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
      })

      const uploadList = await Upload.list.delegate({
        issuer: alice.agent.issuer,
        audience: bob,
        with: space.did(),
      })

      const result = await alice.capability.access.delegate({
        delegations: [uploadList],
      })

      assert.ok(result.ok)

      const delegations = await bob.capability.access.claim()
      assert.deepEqual(delegations, [uploadList])
    },
  },
})

Test.test({ AccessClient })

import { AgentData } from '@storacha/access/agent'
import { Client } from '../../src/client.js'
import * as Test from '../test.js'

export const SpaceClient = Test.withContext({
  info: {
    'should retrieve space info': async (
      assert,
      { connection, provisionsStorage }
    ) => {
      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
      })

      const space = await alice.createSpace('test')
      const auth = await space.createAuthorization(alice, {
        access: { 'space/info': {} },
        expiration: Infinity,
      })
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())
      // Then we setup a billing for this account
      await provisionsStorage.put({
        // @ts-expect-error
        provider: connection.id.did(),
        account: alice.agent.did(),
        consumer: space.did(),
      })

      const info = await alice.capability.space.info(space.did())

      assert.equal(info.did, space.did())
      assert.deepEqual(info.providers, [connection.id.did()])
    },
  },
})

Test.test({ SpaceClient })

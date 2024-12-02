import { AgentData } from '@web3-storage/access/agent'
import { Client } from '../../src/client.js'
import * as Test from '../test.js'
import { receiptsEndpoint } from '../helpers/utils.js'

export const UsageClient = Test.withContext({
  report: {
    'should fetch usage report': async (
      assert,
      { connection, provisionsStorage }
    ) => {
      // 1. Setup alice account
      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
      })

      const space = await alice.createSpace('test', {
        skipGatewayAuthorization: true,
      })
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)

      // Then we setup a billing for this account
      await provisionsStorage.put({
        // @ts-expect-error
        provider: connection.id.did(),
        account: alice.agent.did(),
        consumer: space.did(),
      })

      const content = new Blob(['hello world'])
      await alice.uploadFile(content, {
        receiptsEndpoint,
      })

      const period = { from: new Date(0), to: new Date() }

      const report = await alice.capability.usage.report(space.did(), period)

      const [[id, record]] = Object.entries(report)
      assert.equal(id, connection.id.did())

      assert.equal(record.provider, connection.id.did())
      assert.equal(record.space, space.did())
      assert.equal(record.period.from, period.from.toISOString())
      assert.ok(record.period.to > period.to.toISOString())
      assert.equal(record.size.initial, 0)
      assert.ok(record.size.final >= content.size)
      assert.ok(record.events.length > 0)
    },

    'should be empty on unknown space': async (assert, { connection }) => {
      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
      })

      const space = await alice.createSpace('test', {
        skipGatewayAuthorization: true,
      })
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)

      const period = { from: new Date(), to: new Date() }
      const report = await alice.capability.usage.report(space.did(), period)
      assert.deepEqual(report, {})
    },
  },
})

Test.test({ UsageClient })

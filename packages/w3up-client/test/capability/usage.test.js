import { AgentData } from '@web3-storage/access/agent'
import { Client } from '../../src/client.js'
import * as Test from '../test.js'
import { receiptsEndpoint } from '../helpers/utils.js'
import { randomCAR } from '../helpers/random.js'
import { Absentee } from '@ucanto/principal'

export const UsageClient = Test.withContext({
  report: {
    'should fetch usage report': async (
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

      const space = await alice.createSpace('test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)

      const period = { from: new Date(), to: new Date() }
      const report = await alice.capability.usage.report(space.did(), period)
      assert.deepEqual(report, {})
    },
  },
  record: {
    'should record egress': async (
      assert,
      { connection, provisionsStorage }
    ) => {
      const gateway = Absentee.from({
        id: 'did:web:freeway.storacha.network',
      })
      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
      })

      const space = await alice.createSpace('test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      // Then we setup a billing for this account
      await provisionsStorage.put({
        // @ts-expect-error
        provider: connection.id.did(),
        account: alice.agent.did(),
        consumer: space.did(),
      })

      const car = await randomCAR(128)
      const resource = car.cid
      await alice.capability.upload.add(car.roots[0], [resource])

      const result = await alice.capability.upload.get(car.roots[0])
      assert.ok(result)

      const record = await alice.capability.usage.record(
        {
          space: space.did(),
          resource: resource.link(),
          bytes: car.size,
          servedAt: new Date().toISOString(),
        },
        gateway.did()
      )

      assert.ok(record)
    },
  },
})

Test.test({ UsageClient })

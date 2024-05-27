import * as Link from 'multiformats/link'
import * as car from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import { AgentData } from '@web3-storage/access/agent'
import { Client } from '../../src/client.js'
import * as Test from '../test.js'
import { setupGetReceipt } from '../helpers/utils.js'
import { CID } from 'multiformats'

export const UsageClient = Test.withContext({
  report: {
    'should fetch usage report': async (
      assert,
      { connection, provisionsStorage, allocationsStorage }
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

      const bytes = Buffer.from('hello world')
      const bytesHash = await sha256.digest(bytes)
      const link = Link.create(car.code, bytesHash)

      // hardcoded the index shards so as not to reimplement sharding logic
      // TODO there's probably a better way to do this
      const digest = new Uint8Array([
        18, 32, 185, 77, 39, 185, 147, 77, 62, 8, 165, 46, 82, 215, 218, 125,
        171, 250, 196, 132, 239, 227, 122, 83, 128, 238, 144, 136, 247, 172,
        226, 239, 205, 233,
      ])
      // @ts-ignore Argument
      await allocationsStorage.insert({
        space: space.did(),
        blob: {
          digest: digest,
          size: digest.length,
        },
      })

      const content = new Blob([bytes])
      await alice.uploadFile(content, {
        fetch: setupGetReceipt(async function* () {
          yield link
          // hardcoded the CID so as not to reimplement index logic
          yield CID.parse(
            'bagbaiera34t5e64wf7evi3fagz5kspk7p5fnjjvfauyrziy6npvos2mpzdzq'
          )
        }),
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
})

Test.test({ UsageClient })

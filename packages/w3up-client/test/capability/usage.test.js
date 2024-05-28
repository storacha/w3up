import * as Link from 'multiformats/link'
import * as UnixFS from '@web3-storage/upload-client/unixfs'
import { codec as CAR } from '@ucanto/transport/car'
import { sha256 } from 'multiformats/hashes/sha2'
import { AgentData } from '@web3-storage/access/agent'
import { Client } from '../../src/client.js'
import * as Test from '../test.js'
import { setupGetReceipt } from '../helpers/utils.js'
import { indexShardedDAG } from '@web3-storage/upload-client'
import { encode } from '@web3-storage/upload-client/car'

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

      /** @type {Array<Map<import('@web3-storage/blob-index/types').SliceDigest, import('@web3-storage/blob-index/types').Position>>} */
      const shardIndexes = []
      /** @type {import('@web3-storage/capabilities/types').CARLink[]} */
      const shards = []
      /** @type {import('@web3-storage/upload-client/types').AnyLink?} */
      let root = null

      const content = new Blob(['hello world'])
      await alice.uploadFile(content, {
        onShardStored: (meta) => {
          root = meta.roots[0]
          shards.push(meta.cid)
          shardIndexes.push(meta.slices)
        },
        fetch: setupGetReceipt(async function* () {
          const { cid, blocks } = await UnixFS.encodeFile(content)
          const car = await encode(blocks, cid)
          yield Link.create(
            CAR.code,
            await sha256.digest(new Uint8Array(await car.arrayBuffer()))
          )
          // @ts-ignore Argument
          const index = await indexShardedDAG(root, shards, shardIndexes)
          // @ts-ignore Argument
          yield Link.create(CAR.code, await sha256.digest(index.ok))
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

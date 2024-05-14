import { ShardedDAGIndex } from '../src/index.js'
import { randomCAR } from './helpers/random.js'
import * as Result from './helpers/result.js'
import { fromShardArchives } from '../src/util.js'

export const test = {
  'from to archive': async (/** @type {import('entail').assert} */ assert) => {
    // Create random CAR and import its contents into a ShardedBlobIndex.
    const contentCAR = await randomCAR(32)
    const contentCARBytes = new Uint8Array(await contentCAR.arrayBuffer())
    const index = await fromShardArchives(contentCAR.roots[0], [
      contentCARBytes,
    ])
    const indexCAR = Result.unwrap(await index.archive())
    const newIndex = Result.unwrap(ShardedDAGIndex.extract(indexCAR))
    assert.notStrictEqual(newIndex.shards.size, 0)
    assert.strictEqual(index.shards.size, newIndex.shards.size)
    // Check that shards in old and new index are the same.
    for (const [key, shard] of newIndex.shards.entries()) {
      const oldShard = index.shards.get(key)
      assert.ok(shard)
      assert.ok(oldShard)
      assert.strictEqual(shard.size, oldShard.size)
    }
  },
}

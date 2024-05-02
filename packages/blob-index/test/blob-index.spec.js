import * as assert from 'assert'
import * as blobIndex from '../src/sharded-dag-index.js'
import * as Result from './helpers/result.js'
import { randomCAR } from './util.js'

describe('blob-index', async () => {
  await testBlobIndex(blobIndex, async (name, test) => it(name, test))
})

/**
 * @param {typeof blobIndex} blobIndex - blob-index module to test
 * @param {import("./test-types.js").TestAdder} test - function to call to add a named test
 */
async function testBlobIndex(blobIndex, test) {
  await test('module is an object', async () => {
    assert.equal(typeof blobIndex, 'object')
  })

  await test('from to archive', async () => {
    // Create random CAR and import its contents into a ShardedBlobIndex.
    const contentCAR = await randomCAR(32)
    const contentCARBytes = new Uint8Array(await contentCAR.arrayBuffer())
    const index = await blobIndex.fromShardArchives(contentCAR.roots[0], [
      contentCARBytes,
    ])
    const indexCAR = Result.unwrap(await index.toArchive())
    const newIndex = await blobIndex.fromArchive(indexCAR)
    assert.notStrictEqual(newIndex.shards.size, 0)
    assert.strictEqual(index.shards.size, newIndex.shards.size)
    // Check that shards in old and new index are the same.
    for (const [key, shard] of newIndex.shards.entries()) {
      const oldShard = index.shards.get(key)
      assert.ok(shard)
      assert.ok(oldShard)
      assert.strictEqual(shard.size, oldShard.size)
    }
  })
}

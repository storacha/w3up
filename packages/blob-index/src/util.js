import { CARReaderStream } from 'carstream'
import { sha256 } from 'multiformats/hashes/sha2'
import * as API from './api.js'
import { create } from './sharded-dag-index.js'

/**
 * Create a sharded DAG index by indexing blocks in the passed CAR shards.
 *
 * @param {API.UnknownLink} content
 * @param {Uint8Array[]} shards
 * @returns {Promise<API.ShardedDAGIndexView>}
 */
export const fromShardArchives = async (content, shards) => {
  const index = create(content)
  for (const s of shards) {
    const digest = await sha256.digest(s)

    await new ReadableStream({
      pull: (c) => {
        c.enqueue(s)
        c.close()
      },
    })
      .pipeThrough(new CARReaderStream())
      .pipeTo(
        new WritableStream({
          write({ cid, blockOffset, blockLength }) {
            index.setSlice(digest, cid.multihash, [blockOffset, blockLength])
          },
        })
      )
  }
  return index
}

/**
 * Indexes a sharded DAG
 *
 * @param {import('multiformats').Link} root
 * @param {import('@web3-storage/capabilities/types').CARLink[]} shards
 * @param {Array<Map<API.SliceDigest, API.Position>>} shardIndexes
 */
export async function indexShardedDAG(root, shards, shardIndexes) {
  const index = create(root)
  for (const [i, shard] of shards.entries()) {
    const slices = shardIndexes[i]
    index.shards.set(shard.multihash, slices)
  }
  return await index.archive()
}

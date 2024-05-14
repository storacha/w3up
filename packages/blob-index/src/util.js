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

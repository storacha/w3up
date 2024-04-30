import * as API from '../../src/types.js'
import { sha256 } from 'multiformats/hashes/sha2'
import * as Link from 'multiformats/link'
import { CAR, ok } from '@ucanto/core'
import { compare } from 'uint8arrays'
import * as dagCBOR from '@ipld/dag-cbor'
import { CARReaderStream } from 'carstream'
import { DigestMap } from '../../src/index/lib/digest-map.js'

/** @implements {API.ShardedDAGIndex} */
class ShardedDAGIndex {
  /** @param {API.UnknownLink} content */
  constructor (content) {
    this.content = content
    this.shards = /** @type {API.ShardedDAGIndex['shards']} */ (new DigestMap())
  }

  /** @returns {Promise<API.Result<Uint8Array>>} */
  async toArchive () {
    const blocks = new Map()
    const shards = [...this.shards.entries()].sort((a, b) => compare(a[0].digest, b[0].digest))
    const index = { content: this.content, shards: /** @type {API.Link[]} */ ([]) }
    for (const s of shards) {
      const slices = [...s[1].entries()].sort((a, b) => compare(a[0].digest, b[0].digest))
      const bytes = dagCBOR.encode([s[0].bytes, slices])
      const digest = await sha256.digest(bytes)
      const cid = Link.create(dagCBOR.code, digest)
      blocks.set(cid.toString(), { cid, bytes })
      index.shards.push(cid)
    }
    const bytes = dagCBOR.encode(index)
    const digest = await sha256.digest(bytes)
    const cid = Link.create(dagCBOR.code, digest)
    return ok(CAR.encode({ roots: [{ cid, bytes }], blocks }))
  }
}

/**
 * Create a sharded DAG index by indexing blocks in the the passed CAR shards.
 *
 * @param {API.UnknownLink} content
 * @param {Uint8Array[]} shards
 */
export const fromShardArchives = async (content, shards) => {
  const index = new ShardedDAGIndex(content)
  for (const s of shards) {
    const slices = new DigestMap()
    const digest = await sha256.digest(s)
    index.shards.set(digest, slices)

    await new ReadableStream({ pull: c => { c.enqueue(s); c.close() } })
      .pipeThrough(new CARReaderStream())
      .pipeTo(new WritableStream({
        write (block) {
          slices.set(block.cid.multihash, [block.blockOffset, block.blockLength])
        }
      }))
  }
  return index
}

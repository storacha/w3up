import * as API from './api.js'
import { CAR, ok } from '@ucanto/core'
import * as UI from '@ucanto/interface'
import { CARReaderStream } from 'carstream'
import { compare } from 'uint8arrays'
import * as dagCBOR from '@ipld/dag-cbor'
import * as Digest from 'multiformats/hashes/digest'
import { DigestMap } from './digest-map.js'
import * as Link from 'multiformats/link'
import { error, Schema, Failure } from '@ucanto/server'
import { sha256 } from 'multiformats/hashes/sha2'

const indexVersion = 'index/sharded/dag@0.1'

export const ShardedDAGIndexSchema = Schema.variant({
  'index/sharded/dag@0.1': Schema.struct({
    /** DAG root. */
    content: Schema.link(),
    /** Shards the DAG can be found in. */
    shards: Schema.array(Schema.link()),
  }),
})

export const MultihashSchema = Schema.bytes()

export const BlobIndexSchema = Schema.tuple([
  MultihashSchema,
  Schema.array(
    /** multihash bytes, offset, length. */
    Schema.tuple([
      MultihashSchema,
      Schema.tuple([Schema.number(), Schema.number()]),
    ])
  ),
])

/** @param {ReadableStream<Uint8Array>} archive */
export const extract = async (archive) => {
  const blocks = new DigestMap()
  const reader = new CARReaderStream()
  await archive.pipeThrough(reader).pipeTo(
    new WritableStream({
      write: (block) => {
        blocks.set(block.cid.multihash, block.bytes)
      },
    })
  )

  const header = await reader.getHeader()
  if (header.roots[0]?.code !== dagCBOR.code) {
    return error(
      /** @type {import('@web3-storage/capabilities/types').UnknownFormat} */
      ({ name: 'UnknownFormat' })
    )
  }

  return view({ root: header.roots[0], blocks })
}

/**
 * @param {object} source
 * @param {API.UnknownLink} source.root
 * @param {Map<API.MultihashDigest, Uint8Array>} source.blocks
 * @returns {API.Result<API.ShardedDAGIndex, API.DecodeFailure|API.UnknownFormat>}
 */
export const view = ({ root, blocks }) => {
  const rootBytes = blocks.get(root.multihash)
  if (!rootBytes) {
    return error(new DecodeFailure(`missing root block: ${root}`))
  }

  const [version, dagIndexData] = ShardedDAGIndexSchema.match(
    dagCBOR.decode(rootBytes)
  )
  switch (version) {
    case 'index/sharded/dag@0.1': {
      const dagIndex = {
        content: dagIndexData.content,
        shards: new DigestMap(),
      }
      for (const shard of dagIndexData.shards) {
        const shardBytes = blocks.get(shard.multihash)
        if (!shardBytes) {
          return error(new DecodeFailure(`missing shard block: ${shard}`))
        }

        const blobIndexData = BlobIndexSchema.from(dagCBOR.decode(shardBytes))
        const blobIndex = new DigestMap()
        for (const [digest, [offset, length]] of blobIndexData[1]) {
          blobIndex.set(Digest.decode(digest), [offset, length])
        }
        dagIndex.shards.set(Digest.decode(blobIndexData[0]), blobIndex)
      }
      return ok(dagIndex)
    }
    default:
      return error(
        /** @type {import('@web3-storage/capabilities/types').UnknownFormat} */
        ({ name: 'UnknownFormat' })
      )
  }
}

class DecodeFailure extends Failure {
  #reason

  /** @param {string} [reason] */
  constructor(reason) {
    super()
    this.name = /** @type {const} */ ('DecodeFailure')
    this.#reason = reason
  }

  describe() {
    return this.#reason ?? 'failed to decode'
  }
}

/**
 *
 * @param {API.UnknownLink} content
 * @returns {API.ShardedDAGIndex}
 */
export function makeShardedDAGINdex(content) {
  return new ShardedDAGIndex(content)
}

/** @implements {API.ShardedDAGIndex} */
class ShardedDAGIndex {
  /** @param {API.UnknownLink} content */
  constructor(content) {
    this.content = content
    this.shards = /** @type {API.ShardedDAGIndex['shards']} */ (new DigestMap())
  }

  /** @returns {Promise<API.Result<Uint8Array>>} */
  async toArchive() {
    const blocks = new Map()
    const shards = [...this.shards.entries()].sort((a, b) =>
      compare(a[0].digest, b[0].digest)
    )
    const index = {
      content: this.content,
      shards: /** @type {UI.Link[]} */ ([]),
    }
    for (const s of shards) {
      const slices = [...s[1].entries()]
        .sort((a, b) => compare(a[0].digest, b[0].digest))
        .map((e) => [e[0].bytes, e[1]])
      const bytes = dagCBOR.encode([s[0].bytes, slices])
      const digest = await sha256.digest(bytes)
      const cid = Link.create(dagCBOR.code, digest)
      blocks.set(cid.toString(), { cid, bytes })
      index.shards.push(cid)
    }
    const bytes = dagCBOR.encode({ 'index/sharded/dag@0.1': index })
    const digest = await sha256.digest(bytes)
    const cid = Link.create(dagCBOR.code, digest)
    return ok(CAR.encode({ roots: [{ cid, bytes }], blocks }))
  }
}

/**
 * @param {Uint8Array} carData
 * @returns {Promise<ShardedDAGIndex>}
 */
export const fromArchive = async (carData) => {
  const carContent = CAR.decode(carData)
  //console.log('Decoded CAR data:', carContent)
  const root0 = carContent.roots[0]
  const rootCID = root0.cid
  const rootBytes = root0.bytes
  const newCID = Link.create(dagCBOR.code, await sha256.digest(rootBytes))
  if (!newCID.equals(rootCID)) {
    throw new Error('bad index cid')
  }
  const dec = dagCBOR.decode(rootBytes)
  const indexData = dec[indexVersion]
  if (indexData === undefined) {
    throw new Error('no data for version ' + indexVersion)
  }
  const content = indexData.content
  //const shardLinks = indexData.shards
  const dagIndex = new ShardedDAGIndex(content)

  const blocks = carContent.blocks
  const rootCIDStr = rootCID.toString()

  // Get block that holds root shard and remove it.
  const shardBlock = blocks.get(rootCIDStr)
  if (shardBlock === undefined) {
    throw new Error('missing shard slice')
  }
  blocks.delete(rootCIDStr)

  // Read remaining blocks into slices for each shard.
  for (const [shardCIDStr, block] of blocks.entries()) {
    if (shardCIDStr !== block.cid.toString()) {
      throw new Error('bad block cid')
    }
    // Decode block into [[shard-mh-bytes], [ [[slice-mh-bytes], [offset,length]] ]]
    const slicesData = dagCBOR.decode(block.bytes)
    //console.log('Decoded shard data:', slicesData)
    const shardMh = Digest.decode(slicesData[0])
    const slices = new DigestMap()
    dagIndex.shards.set(shardMh, slices)
    for (const s of slicesData[1]) {
      const mh = Digest.decode(s[0])
      // Store slice in current shard.
      slices.set(mh, s[1])
      //const [offset, length] = s[1]
      //console.log('multihash:', mh, 'offset:', offset, 'lenght:', length)
    }
  }
  return dagIndex
}

/**
 * Create a sharded DAG index by indexing blocks in the the passed CAR shards.
 *
 * @param {API.UnknownLink} content
 * @param {Uint8Array[]} shards
 * @returns {Promise<ShardedDAGIndex>}
 */
export const fromShardArchives = async (content, shards) => {
  const index = new ShardedDAGIndex(content)
  for (const s of shards) {
    const slices = new DigestMap()
    const digest = await sha256.digest(s)
    index.shards.set(digest, slices)

    await new ReadableStream({
      pull: (c) => {
        c.enqueue(s)
        c.close()
      },
    })
      .pipeThrough(new CARReaderStream())
      .pipeTo(
        new WritableStream({
          write(block) {
            slices.set(block.cid.multihash, [
              block.blockOffset,
              block.blockLength,
            ])
          },
        })
      )
  }
  return index
}

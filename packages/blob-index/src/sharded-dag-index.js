import * as API from './api.js'
import { CAR, ok, error, Schema, Failure } from '@ucanto/core'
import { compare } from 'uint8arrays'
import * as dagCBOR from '@ipld/dag-cbor'
import * as Digest from 'multiformats/hashes/digest'
import * as Link from 'multiformats/link'
import { sha256 } from 'multiformats/hashes/sha2'
import { DigestMap } from './digest-map.js'

export const version = 'index/sharded/dag@0.1'

export const ShardedDAGIndexSchema = Schema.variant({
  [version]: Schema.struct({
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

/**
 * @param {Uint8Array} archive
 * @returns {API.Result<API.ShardedDAGIndexView, API.DecodeFailure|API.UnknownFormat>}
 */
export const extract = (archive) => {
  const { roots, blocks } = CAR.decode(archive)

  if (!roots.length) {
    return error(new UnknownFormat('missing root block'))
  }

  const { code } = roots[0].cid
  if (code !== dagCBOR.code) {
    return error(
      new UnknownFormat(`unexpected root CID codec: 0x${code.toString(16)}`)
    )
  }

  return view({ root: roots[0], blocks })
}

/**
 * @param {object} source
 * @param {API.IPLDBlock} source.root
 * @param {Map<string, API.IPLDBlock>} source.blocks
 * @returns {API.Result<API.ShardedDAGIndexView, API.DecodeFailure|API.UnknownFormat>}
 */
export const view = ({ root, blocks }) => {
  const [version, dagIndexData] = ShardedDAGIndexSchema.match(
    dagCBOR.decode(root.bytes)
  )
  switch (version) {
    case version: {
      const dagIndex = create(dagIndexData.content)
      for (const shardLink of dagIndexData.shards) {
        const shard = blocks.get(shardLink.toString())
        if (!shard) {
          return error(new DecodeFailure(`missing shard block: ${shardLink}`))
        }

        const blobIndexData = BlobIndexSchema.from(dagCBOR.decode(shard.bytes))
        const blobIndex = new DigestMap()
        for (const [digest, [offset, length]] of blobIndexData[1]) {
          blobIndex.set(Digest.decode(digest), [offset, length])
        }
        dagIndex.shards.set(Digest.decode(blobIndexData[0]), blobIndex)
      }
      return ok(dagIndex)
    }
    default:
      return error(new UnknownFormat(`unknown index version: ${version}`))
  }
}

/** @implements {API.ShardedDAGIndexView} */
class ShardedDAGIndex {
  #content
  #shards

  /** @param {API.UnknownLink} content */
  constructor(content) {
    this.#content = content
    /** @type {DigestMap<API.ShardDigest, API.Position>} */
    this.#shards = new DigestMap()
  }

  get content() {
    return this.#content
  }

  get shards() {
    return this.#shards
  }

  /**
   * @param {API.ShardDigest} shard
   * @param {API.SliceDigest} slice
   * @param {API.Position} pos
   */
  setSlice(shard, slice, pos) {
    let index = this.#shards.get(shard)
    if (!index) {
      index = new DigestMap()
      this.#shards.set(shard, index)
    }
    index.set(slice, pos)
  }

  archive() {
    return archive(this)
  }
}

export class UnknownFormat extends Failure {
  #reason

  /** @param {string} [reason] */
  constructor(reason) {
    super()
    this.name = /** @type {const} */ ('UnknownFormat')
    this.#reason = reason
  }

  describe() {
    return this.#reason ?? 'unknown format'
  }
}

export class DecodeFailure extends Failure {
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
 * @param {API.UnknownLink} content
 * @returns {API.ShardedDAGIndexView}
 */
export const create = (content) => new ShardedDAGIndex(content)

/**
 * @param {API.ShardedDAGIndex} model
 * @returns {Promise<API.Result<Uint8Array>>}
 */
export const archive = async (model) => {
  const blocks = new Map()
  const shards = [...model.shards.entries()].sort((a, b) =>
    compare(a[0].digest, b[0].digest)
  )
  const index = {
    content: model.content,
    shards: /** @type {API.Link[]} */ ([]),
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
  const bytes = dagCBOR.encode({ [version]: index })
  const digest = await sha256.digest(bytes)
  const cid = Link.create(dagCBOR.code, digest)
  return ok(CAR.encode({ roots: [{ cid, bytes }], blocks }))
}

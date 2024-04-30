import { CARReaderStream } from 'carstream'
import * as dagCBOR from '@ipld/dag-cbor'
import { ok, error, Schema, Failure, base58btc } from '@ucanto/server'
import * as Digest from 'multiformats/hashes/digest'
import * as API from './api.js'
import { DigestMap } from './digest-map.js'

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
    Schema.tuple([MultihashSchema, Schema.number(), Schema.number()])
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
  if (header.roots[0].code !== dagCBOR.code) {
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
    case 'index/sharded/dag@0.1':
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
        for (const [digest, offset, length] of blobIndexData[1]) {
          blobIndex.set(Digest.decode(digest), [offset, length])
        }
        dagIndex.shards.set(Digest.decode(blobIndexData[0]), blobIndex)
      }
      return ok(dagIndex)
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

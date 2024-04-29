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
    shards: Schema.array(Schema.link())
  }),
})

export const BlobIndexSchema = Schema.tuple([
  /** multihash bytes. */
  Schema.bytes(),
  Schema.array(
    /** multihash bytes, offset, length. */
    Schema.tuple([Schema.bytes(), Schema.number(), Schema.number()])
  ),
])

/**
 * @param {ReadableStream<Uint8Array>} archive
 * @returns {Promise<API.Result<API.ShardedDAGIndex, API.DecodeFailure|API.UnknownFormat>>}
 */
export const extract = async archive => {
  const blocks = new DigestMap()
  const reader = new CARReaderStream()
  await archive.pipeThrough(reader).pipeTo(new WritableStream({
    write: block => { blocks.set(block.cid.multihash, block.bytes) },
  }))

  const header = await reader.getHeader()
  if (header.roots[0].code !== dagCBOR.code) {
    return error(
      /** @type {import('@web3-storage/capabilities/types').UnknownFormat} */
      ({ name: 'UnknownFormat' })
    )
  }

  const rootBlock = blocks.get(header.roots[0])
  if (!rootBlock) {
    return error(new DecodeFailure(`failed to find root block in archive: ${header.roots[0]}`))
  }

  const [version, dagIndexData] = ShardedDAGIndexSchema.match(dagCBOR.decode(rootBlock.bytes))
  switch (version) {
    case 'index/sharded/dag@0.1':
      const dagIndex = {
        content: dagIndexData.content,
        shards: new DigestMap()
      }
      for (const shard of dagIndexData.shards) {
        const shardBlock = blocks.get(shard.multihash)
        if (!shardBlock) return error(new DecodeFailure(`failed to find shard block in archive: ${base58btc.encode(shard.multihash.digest)}`))

        const blobIndexData = BlobIndexSchema.from(dagCBOR.decode(shardBlock.bytes))
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
  constructor (reason) {
    super()
    this.name = /** @type {const} */ ('DecodeFailure')
    this.#reason = reason
  }

  describe () {
    return this.#reason ?? 'failed to decode'
  }
}

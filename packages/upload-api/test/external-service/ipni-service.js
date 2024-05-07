import * as API from '../../src/types.js'
import { base58btc } from 'multiformats/bases/base58'
import { ok, error } from '@ucanto/core'
import { DigestMap } from '../../src/index/lib/digest-map.js'
import { RecordNotFound } from '../../src/errors.js'

/** @implements {API.IPNIService} */
export class IPNIService {
  #data

  constructor() {
    this.#data = new DigestMap()
  }

  /** @param {API.ShardedDAGIndex} index */
  async publish(index) {
    for (const [, slices] of index.shards) {
      for (const [ digest ] of slices) {
        this.#data.set(digest, true)
      }
    }
    return ok({})
  }

  /** @param {API.MultihashDigest} digest */
  async query(digest) {
    const exists = this.#data.has(digest)
    if (!exists) {
      const mhstr = base58btc.encode(digest.bytes)
      return error(new RecordNotFound(`advert not found: ${mhstr}`))
    }
    return ok({})
  }
}

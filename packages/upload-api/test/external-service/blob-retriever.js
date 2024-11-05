import { ok, error } from '@ucanto/core'
import * as API from '../../src/types.js'
import { BlobNotFound } from '../../src/blob.js'

/**
 * @param {API.ClaimReader} claims
 * @returns {API.BlobRetriever}
 */
export const create = (claims) => {
  return {
    /** @type {API.BlobRetriever['stream']} */
    async stream(digest) {
      const readResult = await claims.read(digest)
      if (readResult.error) throw readResult.error
      for (const claim of readResult.ok) {
        if (claim.type === 'assert/location') {
          const res = await fetch(claim.location[0])
          if (!res.body) throw new Error('missing response body')
          return ok(res.body)
        }
      }
      return error(new BlobNotFound(digest))
    },
  }
}

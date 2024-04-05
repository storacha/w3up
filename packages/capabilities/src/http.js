/**
 * HTTP Capabilities.
 *
 * These can be imported directly with:
 * ```js
 * import * as HTTP from '@web3-storage/capabilities/http'
 * ```
 *
 * @module
 */
import { capability, Schema, ok } from '@ucanto/validator'
import { blobStruct } from './blob.js'
import { equal, equalBlob, equalWith, SpaceDID, and } from './utils.js'

/**
 * `http/put` capability invocation MAY be performed by any agent on behalf of the subject.
 * The `blob/add` provider MUST add `/http/put` effect and capture private key of the
 * `subject` in the `meta` field so that any agent could perform it.
 */
export const put = capability({
  can: 'http/put',
  /**
   * DID of the (memory) space where Blob is intended to
   * be stored.
   */
  with: SpaceDID,
  nb: Schema.struct({
    /**
     * Blob to allocate on the space.
     */
    blob: blobStruct,
    /**
     * Blob to accept.
     */
    address: Schema.struct({
      /**
       * HTTP(S) location that can receive blob content via HTTP PUT request.
       */
      url: Schema.string(),
      /**
       * HTTP headers.
       */
      headers: Schema.unknown(),
    }).optional(),
  }),
  derives: (claim, from) => {
    return (
      and(equalWith(claim, from)) ||
      and(equalBlob(claim, from)) ||
      and(equal(claim.nb.address?.url, from.nb.address, 'url')) ||
      and(equal(claim.nb.address?.headers, from.nb.address, 'headers')) ||
      ok({})
    )
  },
})

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
import { content } from './blob.js'
import { equal, equalBody, equalWith, SpaceDID, and } from './utils.js'

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
     * Description of body to send (digest/size).
     */
    body: content,
    // TODO: what should be used?
    /**
     * HTTP(S) location that can receive blob content via HTTP PUT request.
     */
    // url: Schema.struct({
    //   'ucan/await': Schema.unknown(),
    // }).optional(),
    // /**
    //  * HTTP headers.
    //  */
    // headers: Schema.struct({
    //   'ucan/await': Schema.unknown(),
    // }).optional(),
    /**
     * HTTP(S) location that can receive blob content via HTTP PUT request.
     */
    url: Schema.string(),
    /**
     * HTTP headers.
     */
    headers: Schema.dictionary({ value: Schema.string() }),
  }),
  derives: (claim, from) => {
    return (
      and(equalWith(claim, from)) ||
      and(equalBody(claim, from)) ||
      and(equal(claim.nb.url, from.nb, 'url')) ||
      and(equal(claim.nb.headers, from.nb, 'headers')) ||
      ok({})
    )
  },
})

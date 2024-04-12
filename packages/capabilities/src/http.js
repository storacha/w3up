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
import { equal, equalBody, equalWith, SpaceDID, Await, and } from './utils.js'

/**
 * `http/put` capability invocation MAY be performed by any authorized agent on behalf of the subject
 * as long as they have referenced `body` content to do so.
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
    /**
     * HTTP(S) location that can receive blob content via HTTP PUT request.
     */
    url: Schema.string().or(Await),
    /**
     * HTTP headers.
     */
    headers: Schema.dictionary({ value: Schema.string() }).or(Await),
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

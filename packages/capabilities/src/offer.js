/**
 * Offer Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Offer from '@web3-storage/capabilities/offer'
 * ```
 *
 * @module
 */
import { capability, URI, Schema } from '@ucanto/validator'

/**
 * Capability can be used to arrange an offer with an aggregate of CARs.
 */
export const arrange = capability({
  can: 'offer/arrange',
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    /**
     * Commitment proof for the aggregate being requested.
     */
    commitmentProof: Schema.string(),
  }),
})

// ⚠️ We export imports here so they are not omitted in generated typedes
// @see https://github.com/microsoft/TypeScript/issues/51548
export { Schema }

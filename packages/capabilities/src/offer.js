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
import { capability, Schema, ok } from '@ucanto/validator'
import { equalWith, checkLink, and } from './utils.js'

/**
 * Capability can be used to arrange an offer with an aggregate of CARs.
 */
export const arrange = capability({
  can: 'offer/arrange',
  with: Schema.did(),
  nb: Schema.struct({
    /**
     * Commitment proof for the aggregate being requested.
     */
    commitmentProof: Schema.link(),
  }),
  derives: (claim, from) => {
    return (
      and(equalWith(claim, from)) ||
      and(
        checkLink(
          claim.nb.commitmentProof,
          from.nb.commitmentProof,
          'nb.commitmentProof'
        )
      ) ||
      ok({})
    )
  },
})

// ⚠️ We export imports here so they are not omitted in generated typedes
// @see https://github.com/microsoft/TypeScript/issues/51548
export { Schema }

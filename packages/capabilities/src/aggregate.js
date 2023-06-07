/**
 * Aggregate Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Aggregate from '@web3-storage/capabilities/aggregate'
 * ```
 *
 * @module
 */
import { capability, Schema, ok } from '@ucanto/validator'
import { checkLink, equalWith, equal, and } from './utils.js'

/**
 * `aggregate/offer` capability allows agent to create an offer to get an aggregate
 * of CARs files in the market to be fetched and stored by a Storage provider.
 */
export const offer = capability({
  can: 'aggregate/offer',
  /**
   * did:key identifier of the broker authority where offer is made available.
   */
  with: Schema.did(),
  nb: Schema.struct({
    /**
     * CID of the DAG-CBOR encoded block with offer details.
     * Service will queue given offer to be validated and handled.
     */
    offer: Schema.link(),
    /**
     * Commitment proof for the aggregate being offered.
     */
    commitmentProof: Schema.link(),
    /**
     * Size of the combined CAR files to be offered as aggregate.
     */
    size: Schema.integer(),
  }),
  derives: (claim, from) => {
    return (
      and(equalWith(claim, from)) ||
      and(checkLink(claim.nb.offer, from.nb.offer, 'nb.offer')) ||
      and(
        checkLink(
          claim.nb.commitmentProof,
          from.nb.commitmentProof,
          'nb.commitmentProof'
        )
      ) ||
      and(equal(claim.nb.size, from.nb.size, 'nb.size')) ||
      ok({})
    )
  },
})

/**
 * Capability can be used to get information about previously stored aggregates.
 * space identified by `with` field.
 */
export const get = capability({
  can: 'aggregate/get',
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

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
 * @see https://github.com/multiformats/go-multihash/blob/dc3bd6897fcd17f6acd8d4d6ffd2cea3d4d3ebeb/multihash.go#L73
 */
const SHA2_256_TRUNC254_PADDED = 0x1012
/**
 * @see https://github.com/ipfs/go-cid/blob/829c826f6be23320846f4b7318aee4d17bf8e094/cid.go#L104
 */
const FilCommitmentUnsealed = 0xf101

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
     * https://github.com/filecoin-project/go-state-types/blob/1e6cf0d47cdda75383ef036fc2725d1cf51dbde8/abi/piece.go#L47-L50
     */
    piece: Schema.struct({
      /**
       * CID of the aggregate piece.
       */
      link: /** @type {import('./types').PieceLinkSchema} */ (
        Schema.link({
          code: FilCommitmentUnsealed,
          version: 1,
          multihash: {
            code: SHA2_256_TRUNC254_PADDED,
          },
        })
      ),
      /**
       * Height of the perfect binary tree for the piece.
       * It can be used to derive leafCount and consequently `size` of the piece.
       */
      height: Schema.integer(),
    }),
  }),
  derives: (claim, from) => {
    return (
      and(equalWith(claim, from)) ||
      and(checkLink(claim.nb.offer, from.nb.offer, 'nb.offer')) ||
      and(
        checkLink(claim.nb.piece.link, from.nb.piece.link, 'nb.piece.link')
      ) ||
      and(
        equal(claim.nb.piece.height, from.nb.piece.height, 'nb.piece.height')
      ) ||
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
    subject: /** @type {import('./types').PieceLinkSchema} */ (Schema.link()),
  }),
  derives: (claim, from) => {
    return (
      and(equalWith(claim, from)) ||
      and(checkLink(claim.nb.subject, from.nb.subject, 'nb.subject')) ||
      ok({})
    )
  },
})

// ⚠️ We export imports here so they are not omitted in generated typedes
// @see https://github.com/microsoft/TypeScript/issues/51548
export { Schema }

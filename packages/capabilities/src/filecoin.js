/**
 * Filecoin Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Filecoin from '@web3-storage/capabilities/filecoin'
 * ```
 *
 * @module
 */

import { capability, Schema, ok } from '@ucanto/validator'
import { equal, equalWith, checkLink, and } from './utils.js'

/**
 * @see https://github.com/multiformats/go-multihash/blob/dc3bd6897fcd17f6acd8d4d6ffd2cea3d4d3ebeb/multihash.go#L73
 */
const SHA2_256_TRUNC254_PADDED = 0x1012
/**
 * @see https://github.com/ipfs/go-cid/blob/829c826f6be23320846f4b7318aee4d17bf8e094/cid.go#L104
 */
const FilCommitmentUnsealed = 0xf101

/**
 * `filecoin/add` capability allows agent to add a filecoin piece to be aggregated
 * so that it can be stored by a Storage provider on a future time.
 */
export const filecoinAdd = capability({
  can: 'filecoin/add',
  /**
   * did:key identifier of the broker authority where offer is made available.
   */
  with: Schema.did(),
  nb: Schema.struct({
    /**
     * CID of the content that resulted in Filecoin piece.
     */
    content: Schema.link(),
    /**
     * CID of the piece.
     */
    piece: /** @type {import('./types').PieceLinkSchema} */ (
      Schema.link({
        code: FilCommitmentUnsealed,
        version: 1,
        multihash: {
          code: SHA2_256_TRUNC254_PADDED,
        },
      })
    ),
  }),
  derives: (claim, from) => {
    return (
      and(equalWith(claim, from)) ||
      and(checkLink(claim.nb.content, from.nb.content, 'nb.content')) ||
      and(checkLink(claim.nb.piece, from.nb.piece, 'nb.piece')) ||
      ok({})
    )
  },
})

/**
 * `aggregate/add` capability allows agent to add a piece to be aggregated
 * so that it can be stored by a Storage provider on a future time.
 */
export const aggregateAdd = capability({
  can: 'aggregate/add',
  /**
   * did:key identifier of the broker authority where offer is made available.
   */
  with: Schema.did(),
  nb: Schema.struct({
    /**
     * CID of the piece.
     */
    piece: /** @type {import('./types').PieceLinkSchema} */ (
      Schema.link({
        code: FilCommitmentUnsealed,
        version: 1,
        multihash: {
          code: SHA2_256_TRUNC254_PADDED,
        },
      })
    ),
    /**
     * Storefront requestin piece to be aggregated
     */
    storefront: Schema.text(),
    /**
     * Grouping for the piece to be aggregated
     */
    group: Schema.text(),
  }),
  derives: (claim, from) => {
    return (
      and(equalWith(claim, from)) ||
      and(checkLink(claim.nb.piece, from.nb.piece, 'nb.piece')) ||
      and(equal(claim.nb.storefront, from.nb.storefront, 'nb.storefront')) ||
      and(equal(claim.nb.group, from.nb.group, 'nb.group')) ||
      ok({})
    )
  },
})

/**
 * `deal/add` capability allows agent to create a deal offer to get an aggregate
 * of CARs files in the market to be fetched and stored by a Storage provider.
 */
export const dealAdd = capability({
  can: 'deal/add',
  /**
   * did:key identifier of the broker authority where offer is made available.
   */
  with: Schema.did(),
  nb: Schema.struct({
    /**
     * CID of the DAG-CBOR encoded block with offer details.
     * Service will queue given offer to be validated and handled.
     */
    pieces: Schema.link(),
    /**
     * Commitment proof for the aggregate being offered.
     * https://github.com/filecoin-project/go-state-types/blob/1e6cf0d47cdda75383ef036fc2725d1cf51dbde8/abi/piece.go#L47-L50
     */
    aggregate: /** @type {import('./types').PieceLinkSchema} */ (
      Schema.link({
        code: FilCommitmentUnsealed,
        version: 1,
        multihash: {
          code: SHA2_256_TRUNC254_PADDED,
        },
      })
    ),
    /**
     * Storefront requesting deal
     */
    storefront: Schema.text(),
    /**
     * arbitrary label to be added to the deal on chain
     */
    label: Schema.text().optional(),
  }),
  derives: (claim, from) => {
    return (
      and(equalWith(claim, from)) ||
      and(checkLink(claim.nb.aggregate, from.nb.aggregate, 'nb.aggregate')) ||
      and(checkLink(claim.nb.pieces, from.nb.pieces, 'nb.pieces')) ||
      and(equal(claim.nb.storefront, from.nb.storefront, 'nb.storefront')) ||
      and(equal(claim.nb.label, from.nb.label, 'nb.label')) ||
      ok({})
    )
  },
})

/**
 * `chain-tracker/info` capability allows agent to get chain info of a given piece.
 */
export const chainTrackerInfo = capability({
  can: 'chain-tracker/info',
  /**
   * did:key identifier of the broker authority where offer is made available.
   */
  with: Schema.did(),
  nb: Schema.struct({
    /**
     * CID of the piece.
     */
    piece: /** @type {import('./types').PieceLinkSchema} */ (
      Schema.link({
        code: FilCommitmentUnsealed,
        version: 1,
        multihash: {
          code: SHA2_256_TRUNC254_PADDED,
        },
      })
    ),
  }),
  derives: (claim, from) => {
    return (
      and(equalWith(claim, from)) ||
      and(checkLink(claim.nb.piece, from.nb.piece, 'nb.piece')) ||
      ok({})
    )
  },
})

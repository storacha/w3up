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
 * @see https://github.com/filecoin-project/FIPs/pull/758/files
 */
const FR32_SHA2_256_TRUNC254_PADDED_BINARY_TREE = 0x1011
/**
 * @see https://github.com/filecoin-project/FIPs/pull/758/files
 */
const RAW_CODE = 0x55

const PIECE_LINK = Schema.link({
  code: RAW_CODE,
  version: 1,
  multihash: {
    code: FR32_SHA2_256_TRUNC254_PADDED_BINARY_TREE,
  },
})

/**
 * `filecoin/queue` capability allows agent to queue a filecoin piece to be aggregated
 * so that it can be stored by a Storage provider on a future time.
 */
export const filecoinQueue = capability({
  can: 'filecoin/queue',
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
    piece: /** @type {import('./types').PieceLinkSchema} */ (PIECE_LINK),
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
 * `filecoin/add` capability allows storefront to add a filecoin piece to be aggregated
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
     *
     * @see https://github.com/filecoin-project/FIPs/pull/758/files
     */
    piece: /** @type {import('./types').PieceLinkSchema} */ (PIECE_LINK),
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
 * `aggregate/queue` capability allows storefront to queue a piece to be aggregated
 * so that it can be stored by a Storage provider on a future time.
 */
export const aggregateQueue = capability({
  can: 'aggregate/queue',
  /**
   * did:key identifier of the broker authority where offer is made available.
   */
  with: Schema.did(),
  nb: Schema.struct({
    /**
     * CID of the piece.
     */
    piece: /** @type {import('./types').PieceLinkSchema} */ (PIECE_LINK),
    /**
     * Grouping for the piece to be aggregated
     */
    group: Schema.text(),
  }),
  derives: (claim, from) => {
    return (
      and(equalWith(claim, from)) ||
      and(checkLink(claim.nb.piece, from.nb.piece, 'nb.piece')) ||
      and(equal(claim.nb.group, from.nb.group, 'nb.group')) ||
      ok({})
    )
  },
})

/**
 * `aggregate/add` capability allows aggregator to add a piece to aggregate
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
     *
     * @see https://github.com/filecoin-project/FIPs/pull/758/files
     */
    piece: /** @type {import('./types').PieceLinkSchema} */ (PIECE_LINK),
    /**
     * Storefront requesting piece to be aggregated
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
 * `deal/queue` capability allows storefront to create a deal offer to get an aggregate
 * of CARs files in the market to be fetched and stored by a Storage provider.
 */
export const dealQueue = capability({
  can: 'deal/queue',
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
    aggregate: /** @type {import('./types').PieceLinkSchema} */ (PIECE_LINK),
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
 * `deal/add` capability allows Dealer to submit offer with an aggregate of
 * Filecoin pieces in the market to be fetched and stored by a Storage provider.
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
     *
     * @see https://github.com/filecoin-project/go-state-types/blob/1e6cf0d47cdda75383ef036fc2725d1cf51dbde8/abi/piece.go#L47-L50
     * @see https://github.com/filecoin-project/FIPs/pull/758/files
     */
    aggregate: /** @type {import('./types').PieceLinkSchema} */ (PIECE_LINK),
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
     *
     * @see https://github.com/filecoin-project/FIPs/pull/758/files
     */
    piece: /** @type {import('./types').PieceLinkSchema} */ (PIECE_LINK),
  }),
  derives: (claim, from) => {
    return (
      and(equalWith(claim, from)) ||
      and(checkLink(claim.nb.piece, from.nb.piece, 'nb.piece')) ||
      ok({})
    )
  },
})

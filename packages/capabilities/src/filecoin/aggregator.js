/**
 * Filecoin Aggregator Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Aggregator from '@web3-storage/capabilities/filecoin/aggregator'
 * ```
 *
 * @module
 */

import { capability, Schema, ok } from '@ucanto/validator'
import { PieceLink } from './lib.js'
import { equal, equalWith, checkLink, and } from '../utils.js'

/**
 * Capability that allows a Storefront to request that a piece be aggregated
 * for inclusion in an upcoming an Filecoin deal.
 */
export const pieceOffer = capability({
  can: 'piece/offer',
  /**
   * DID of an authorized Storefront.
   */
  with: Schema.did(),
  nb: Schema.struct({
    /**
     * CID of the piece.
     */
    piece: PieceLink,
    /**
     * Grouping of joining segments into an aggregate.
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
 * Capability that allows an Aggregator to signal a piece has been accepted
 * or rejected for inclusion in an aggregate.
 */
export const pieceAccept = capability({
  can: 'piece/accept',
  /**
   * DID of the Aggregator.
   */
  with: Schema.did(),
  nb: Schema.struct({
    /**
     * CID of the piece.
     *
     * @see https://github.com/filecoin-project/FIPs/pull/758/files
     */
    piece: PieceLink,
    /**
     * Grouping of joining segments into an aggregate.
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

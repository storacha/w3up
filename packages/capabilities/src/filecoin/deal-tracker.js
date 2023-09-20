/**
 * Filecoin Deal Tracker Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as DealTracker from '@web3-storage/capabilities/filecoin/deal-tracker'
 * ```
 *
 * @module
 */

import { capability, Schema, ok } from '@ucanto/validator'
import { PieceLink } from './lib.js'
import { equalWith, checkLink, and } from '../utils.js'

/**
 * Capability allowing a Storefront or Aggregator to obtain deal information
 * for a given aggregate piece.
 */
export const dealInfo = capability({
  can: 'deal/info',
  /**
   * DID of the Storefront.
   */
  with: Schema.did(),
  nb: Schema.struct({
    /**
     * CID of the piece.
     *
     * @see https://github.com/filecoin-project/FIPs/pull/758/files
     */
    piece: PieceLink,
  }),
  derives: (claim, from) => {
    return (
      and(equalWith(claim, from)) ||
      and(checkLink(claim.nb.piece, from.nb.piece, 'nb.piece')) ||
      ok({})
    )
  },
})

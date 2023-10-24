/**
 * Filecoin Dealer Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Dealer from '@web3-storage/capabilities/filecoin/dealer'
 * ```
 *
 * @module
 */

import { capability, Schema, ok } from '@ucanto/validator'
import { PieceLink } from './lib.js'
import { equalWith, checkLink, and } from '../utils.js'

/**
 * Capability allowing an Aggregator to request an aggregate to be added to a
 * deal with a Storage Provider.
 */
export const aggregateOffer = capability({
  can: 'aggregate/offer',
  /**
   * DID of an authorized Storefront.
   */
  with: Schema.did(),
  nb: Schema.struct({
    /**
     * Commitment proof for the aggregate being offered.
     */
    aggregate: PieceLink,
    /**
     * CID of the DAG-CBOR encoded block with offer details.
     * Service will queue given offer to be validated and handled.
     */
    pieces: Schema.link({ version: 1 }),
  }),
  derives: (claim, from) => {
    return (
      and(equalWith(claim, from)) ||
      and(checkLink(claim.nb.aggregate, from.nb.aggregate, 'nb.aggregate')) ||
      and(checkLink(claim.nb.pieces, from.nb.pieces, 'nb.pieces')) ||
      ok({})
    )
  },
})

/**
 * Capability that allows a Dealer to signal an aggregate has been accepted
 * for inclusion in a Filecoin deal.
 */
export const aggregateAccept = capability({
  can: 'aggregate/accept',
  /**
   * did:key identifier of the broker authority where offer is made available.
   */
  with: Schema.did(),
  nb: Schema.struct({
    /**
     * Commitment proof for the aggregate being offered.
     */
    aggregate: PieceLink,
    /**
     * CID of the DAG-CBOR encoded block with offer details.
     * Service will queue given offer to be validated and handled.
     */
    pieces: Schema.link(),
  }),
  derives: (claim, from) => {
    return (
      and(equalWith(claim, from)) ||
      and(checkLink(claim.nb.aggregate, from.nb.aggregate, 'nb.aggregate')) ||
      and(checkLink(claim.nb.pieces, from.nb.pieces, 'nb.pieces')) ||
      ok({})
    )
  },
})

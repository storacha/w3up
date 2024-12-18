/**
 * Filecoin Storefront Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Storefront from '@web3-storage/capabilities/filecoin/storefront'
 * ```
 *
 * @module
 */

import { capability, Schema, ok } from '@ucanto/validator'
import { PieceLink } from './lib.js'
import { equalWith, checkLink, and } from '../utils.js'

/**
 * Top-level capability for Filecoin operations.
 */
export const filecoin = capability({
  can: 'filecoin/*',
  /**
   * DID of the space the content is stored in.
   */
  with: Schema.did(),
  derives: equalWith,
})

/**
 * Capability allowing an agent to _request_ storing a content piece in
 * Filecoin.
 */
export const filecoinOffer = capability({
  can: 'filecoin/offer',
  /**
   * DID of the space the content is stored in.
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
    piece: PieceLink,
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
 * Capability allowing a Storefront to signal that an offered piece has been
 * submitted to the filecoin storage pipeline.
 */
export const filecoinSubmit = capability({
  can: 'filecoin/submit',
  /**
   * DID of the Storefront.
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
    piece: PieceLink,
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
 * Capability allowing a Storefront to signal that a submitted piece has been
 * accepted in a Filecoin deal. The receipt contains the proof.
 */
export const filecoinAccept = capability({
  can: 'filecoin/accept',
  /**
   * DID of the Storefront.
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
    piece: PieceLink,
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
 * Capability allowing an agent to _request_ info about a content piece in
 * Filecoin deals.
 */
export const filecoinInfo = capability({
  can: 'filecoin/info',
  /**
   * DID of the space the content is stored in.
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

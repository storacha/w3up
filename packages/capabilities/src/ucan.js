/**
 * UCAN core capabilities.
 */

import { capability, Schema } from '@ucanto/validator'
import * as API from '@ucanto/interface'
import { equalWith, equal, and, checkLink } from './utils.js'

export const UCANLink =
  /** @type {Schema.Schema<API.UCANLink, unknown>} */
  (Schema.link({ version: 1 }))

/**
 * Capability can only be delegated (but not invoked) allowing audience to
 * derived any `store/` prefixed capability for the (memory) space identified
 * by DID in the `with` field.
 */
export const ucan = capability({
  can: 'ucan/*',
  with: Schema.did(),
  derives: equalWith,
})

/**
 * `ucan/revoke` capability is a replacement for the
 * [UCAN Revocation](https://github.com/ucan-wg/spec#66-revocation) that had
 * been proposed to a UCAN working group and had a tentative support from
 * members.
 *
 * Capability can be used to revoke `nb.ucan` authorization from all proofs
 * chains that lead to the UCAN issued or being delegated to the principal
 * identified by the `with` field. Note that revoked UCAN MUST continue to
 * be valid in the invocation where proof chain does not lead to the principal
 * identified by the `with` field.
 */
export const revoke = capability({
  can: 'ucan/revoke',
  /**
   * DID of the principal authorizing revocation.
   */
  with: Schema.did(),
  nb: Schema.struct({
    /**
     * UCAN being revoked from all proof chains that lead to the UCAN that is
     * either issued (iss) by or delegated to (aud) the principal identified
     * by the `with` field.
     */
    ucan: UCANLink,
    /**
     * Proof chain illustrating the path from revoked UCAN to the one that is
     * either issued (iss) by or delegated to (aud) the principal identified
     * by the `with` field.
     *
     * If the UCAN being revoked is either issued (iss) by or delegated to (aud)
     * the principal identified by the `with` field no `proof` is required and
     * it can be omitted or set to an empty array.
     *
     * It is RECOMMENDED that `proof` is provided in all other cases otherwise
     * it MAY not be possible to verify that revoking principal is a participant
     * in the proof chain.
     */
    proof: UCANLink.array().optional(),
  }),
  derives: (claim, from) =>
    // With field MUST be the same
    and(equalWith(claim, from)) ??
    // UCAN being revoked MUST be the same
    and(checkLink(claim.nb.ucan, from.nb.ucan, 'nb.ucan')) ??
    // And proof chain MUST be the same
    equal(
      (claim.nb.proof ?? []).join('/'),
      (from.nb.proof ?? []).join('/'),
      'nb.proof'
    ),
})

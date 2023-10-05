/**
 * UCAN core capabilities.
 */

import { capability, Schema } from '@ucanto/validator'
import { equalWith, checkLink, and } from './utils.js'

export const UCANLink = Schema.link({
  version: 1,
})

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
 */
export const revoke = capability({
  can: 'ucan/revoke',
  /**
   * With MUST be a DID of the UCAN issuer that is in the proof chain of the
   * delegation been revoked.
   */
  with: Schema.did(),
  nb: Schema.struct({
    /**
     * Link of the UCAN been revoked, it MUST be a UCAN be either issued by a
     * principal matching `with` field or depend on the delegation issued by
     * the principal matching `with` field.
     *
     * Alternatively `with` field MAY match the `audience` of the this UCAN,
     * which would imply that that delegate is revoking capabilities delegated
     * to it. This allows delegate to proof that it is unable to invoke
     * delegated capabilities.
     */
    delegation: UCANLink,
  }),
  derives: (claim, from) =>
    and(equalWith(claim, from)) ??
    checkLink(claim.nb.delegation, from.nb.delegation, 'nb.delegation'),
})

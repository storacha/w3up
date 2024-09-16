/**
 * UCAN core capabilities.
 */

import { capability, Schema, ok } from '@ucanto/validator'
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

/**
 * `ucan/conclude` capability represents a receipt using a special UCAN capability.
 *
 * The UCAN invocation specification defines receipt record, that is cryptographically
 * signed description of the invocation output and requested effects. Receipt
 * structure is very similar to UCAN except it has no notion of expiry nor it is
 * possible to delegate ability to issue receipt to another principal.
 */
export const conclude = capability({
  can: 'ucan/conclude',
  /**
   * DID of the principal representing the Conclusion Authority.
   * MUST be the DID of the audience of the ran invocation.
   */
  with: Schema.did(),
  nb: Schema.struct({
    /**
     * CID of the content with the Receipt.
     */
    receipt: Schema.link(),
  }),
  derives: (claim, from) =>
    // With field MUST be the same
    and(equalWith(claim, from)) ||
    and(checkLink(claim.nb.receipt, from.nb.receipt, 'nb.receipt')) ||
    ok({}),
})

/**
 * Issued by trusted authority (usually the one handling invocation) that attest
 * that specific UCAN delegation has been considered authentic.
 *
 * @see https://github.com/storacha/specs/blob/main/w3-session.md#authorization-session
 * 
 * @example
 * ```js
 * {
    iss: "did:web:web3.storage",
    aud: "did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi",
    att: [{
      "with": "did:web:web3.storage",
      "can": "ucan/attest",
      "nb": {
        "proof": {
          "/": "bafyreifer23oxeyamllbmrfkkyvcqpujevuediffrpvrxmgn736f4fffui"
        }
      }
    }],
    exp: null
    sig: "..."
  }
 * ```
 */
export const attest = capability({
  can: 'ucan/attest',
  // Should be web3.storage DID
  with: Schema.did(),
  nb: Schema.struct({
    // UCAN delegation that is being attested.
    proof: Schema.link({ version: 1 }),
  }),
  derives: (claim, from) =>
    // With field MUST be the same
    and(equalWith(claim, from)) ??
    // UCAN link MUST be the same
    checkLink(claim.nb.proof, from.nb.proof, 'nb.proof'),
})

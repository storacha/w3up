import { provide, Delegation, Failure } from '@ucanto/server'
import { revoke } from '@web3-storage/capabilities/ucan'
import * as API from '../types.js'

/**
 * @param {API.UploadServiceContext} context
 * @returns {API.ServiceMethod<API.UCANRevoke, API.Unit, API.UCANRevokeFailure>}
 */
export const ucanRevokeProvider = (context) =>
  provide(revoke, async ({ capability, invocation }) => {
    // First attempt to resolve linked UCANS to ensure that proof chain
    // has been provided.
    const result = resolve({ capability, blocks: invocation.blocks })
    if (result.error) {
      return result
    }
    const { ucan, proof, principal } = result.ok

    // If the principal is issuer or audience of the UCAN been revoked then
    // we can store it as a sole revocation as it will always apply.
    if (isParticipant(ucan, principal)) {
      return { ok: {} }
    }
    // Otherwise we could verify that the principal authorizing revocation
    // is a participant in the proof chain, however we do not do that here
    // since such revocations are not going to apply.
    else {
      return { ok: {} }
    }
  })

/**
 *
 * @param {API.DID} principal
 * @param {API.Delegation} scope
 * @returns {API.Result<API.Unit, API.UnauthorizedRevocation>}
 */
const validatePrincipal = (principal, scope) => {
  if (principal !== scope.issuer.did() && principal !== scope.audience.did()) {
    return {
      error: new UnauthorizedRevocation({
        scope,
        principal,
      }),
    }
  } else {
    return { ok: {} }
  }
}

/**
 * @param {API.Delegation} ucan
 * @param {API.DID} principal
 * @returns
 */
const isParticipant = (ucan, principal) =>
  principal !== ucan.issuer.did() && principal !== ucan.audience.did()

/**
 * @param {object} input
 * @param {API.UCANRevoke} input.capability
 * @param {API.BlockStore<unknown>} input.blocks
 * @returns {API.Result<{ ucan: API.Delegation, proof: API.Delegation[], principal: API.DID }, API.UCANRevokeFailure>}
 */

const resolve = ({ capability, blocks }) => {
  const { nb: input, with: principal } = capability
  // First we try to load UCANs from the invocation blocks, if they are not
  // found we can not verify the revocation and therefore we fail.
  const ucan = Delegation.view({ root: input.ucan, blocks: blocks }, null)

  if (!ucan) {
    return {
      error: new UCANNotFound({ ucan: input.ucan, role: 'nb.ucan' }),
    }
  }

  const proof = []
  for (const [at, root] of (input.proof ?? []).entries()) {
    const ucan = Delegation.view({ root, blocks }, null)
    if (!ucan) {
      return {
        error: new UCANNotFound({ ucan: root, role: `nb.proof[${at}]` }),
      }
    } else {
      proof.push(ucan)
    }
  }

  return { ok: { ucan, proof, principal } }
}

class UCANNotFound extends Failure {
  /**
   * @param {object} input
   * @param {API.UCANLink} input.ucan
   * @param {string} input.role
   */
  constructor({ ucan, role }) {
    super()
    this.ucan = ucan
    this.role = role
  }
  get name() {
    return /** @type {const} */ ('UCANNotFound')
  }
  describe() {
    return `The ${this.role} UCAN ${this.ucan} is not found, it MUST be included with the revocation.`
  }
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      stack: this.stack,
      ucan: { '/': this.ucan.toString() },
    }
  }
}

class UnauthorizedRevocation extends Failure {
  /**
   * @param {object} input
   *
   * @param {API.DID} input.principal
   * @param {API.Delegation} input.scope
   */
  constructor({ principal, scope }) {
    super()
    this.principal = principal
    this.scope = scope
  }
  get name() {
    return /** @type {const} */ ('UnauthorizedRevocation')
  }
  describe() {
    return `The principal ${this.principal} is not authorized to revoke in the scope ${this.scope.cid} where it is neither issuer ${this.issuer} nor audience ${this.audience}.`
  }
  get issuer() {
    return this.scope.issuer.did()
  }
  get audience() {
    return this.scope.audience.did()
  }
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      stack: this.stack,
      issuer: this.issuer,
      audience: this.audience,
      scope: { '/': this.scope.cid.toString() },
    }
  }
}

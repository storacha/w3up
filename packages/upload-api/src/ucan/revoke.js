import { provide, Delegation, Failure } from '@ucanto/server'
import { revoke } from '@storacha/capabilities/ucan'
import * as API from '../types.js'

/**
 * @param {API.RevocationServiceContext} context
 * @returns {API.ServiceMethod<API.UCANRevoke, API.UCANRevokeSuccess, API.UCANRevokeFailure>}
 */
export const ucanRevokeProvider = ({ revocationsStorage }) =>
  provide(revoke, async ({ capability, invocation }) => {
    // First attempt to resolve linked UCANs to ensure that proof chain
    // has been provided.
    const resolveResult = resolve({ capability, blocks: invocation.blocks })
    if (resolveResult.error) {
      return resolveResult
    }
    const { ucan, principal } = resolveResult.ok

    const result =
      // If the principal is issuer or audience of the UCAN being revoked then
      // we can store it as a sole revocation as it will always apply.
      isParticipant(ucan, principal)
        ? await revocationsStorage.reset({
            revoke: ucan.cid,
            scope: principal,
            cause: invocation.cid,
          })
        : // Otherwise we could verify that the principal authorizing revocation
          // is a participant in the proof chain, however we do not do that here
          // since such revocations are not going to apply.
          await revocationsStorage.add({
            revoke: ucan.cid,
            scope: principal,
            cause: invocation.cid,
          })

    return result.error
      ? {
          error: {
            name: 'RevocationsStoreFailure',
            message: result.error.message,
          },
        }
      : { ok: { time: Date.now() } }
  })

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

import { Base } from '../base.js'
import { claimAccess, authorizeWithSocket } from '@web3-storage/access/agent'

/**
 * Client for interacting with the `access/*` capabilities.
 */
export class AccessClient extends Base {
  /* c8 ignore start - testing websocket code is hard */
  /**
   * Authorize the current device to use capabilities granted to email.
   *
   * @param {`${string}@${string}`} email
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   */
  async authorize (email, options) {
    return authorizeWithSocket(this._agent, email, options)
  }
  /* c8 ignore stop */

  /**
   * Claim delegations
   */
  async claim () {
    return claimAccess(this._agent, this._agent.issuer.did(), { addProofs: true })
  }
}

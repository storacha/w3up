import { Base } from '../base.js'
import { claimDelegations, authorizeWithSocket } from '@web3-storage/access/agent'

/**
 * Client for interacting with the `access/*` capabilities.
 */
export class AccessClient extends Base {
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

  /**
   * Claim delegations
   */
  async claim () {
    return claimDelegations(this._agent, this._agent.issuer.did(), { addProofs: true })
  }
}

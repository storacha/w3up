import { Base } from '../base.js'

/**
 * Client for interacting with the `access/*` capabilities.
 */
export class AccessClient extends Base {
  /**
   * Authorize the current device to use capabilities granted to email.
   *
   * @param {string} email
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   */
  async authorize (email, options) {
    return this._agent.authorize(email, options)
  }

  /**
   * Claim delegations
   */
  async claim () {
    return this._agent.claimDelegations()
  }
}

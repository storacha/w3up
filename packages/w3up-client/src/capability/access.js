import { Base } from '../base.js'
import * as Agent from '@web3-storage/access/agent'
import * as DIDMailto from '@web3-storage/did-mailto'
import * as API from '../types.js'

/**
 * Client for interacting with the `access/*` capabilities.
 */
export class AccessClient extends Base {
  /* c8 ignore start - testing websocket code is hard */
  /**
   * Authorize the current agent to use capabilities granted to the passed
   * email account.
   *
   * @param {`${string}@${string}`} email
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   * @param {Iterable<{ can: API.Ability }>} [options.capabilities]
   */
  async authorize(email, options) {
    return authorizeWaitAndClaim(this._agent, email, options)
  }
  /* c8 ignore stop */

  /**
   * Claim delegations granted to the account associated with this agent.
   */
  async claim() {
    return claim(this)
  }

  /**
   * Requests specified `access` level from the account from the given account.
   *
   * @param {object} input
   * @param {DIDMailto.EmailAddress} input.account
   * @param {API.Access} [input.access]
   * @param {AbortSignal} [input.signal]
   */
  async request(input) {
    return request(this, input)
  }
}

/**
 * @param {{agent: API.Agent}} client
 * @param {object} [input]
 * @param {API.DID} [input.audience]
 */
export const claim = async ({ agent }, input) => {
  const result = await Agent.Access.claim(agent)
  if (result.ok) {
    for (const proof of Object.values(result.ok)) {
      await agent.addProof(proof)
      agent.importSpaceFromDelegation(proof)
    }
  }
  return result
}

/**
 * Requests specified `access` level from specified `account`. It will invoke
 * `access/authorize` capability and keep polling `access/claim` capability
 * until access is granted or request is aborted.
 *
 * @param {{agent: API.Agent}} agent
 * @param {object} input
 * @param {API.AccountDID} input.account
 * @param {API.Access} [input.access]
 * @param {API.DID} [input.audience]
 */
export const request = async ({ agent }, input) =>
  Agent.Access.request(agent, input)

export const { spaceAccess, accountAccess } = Agent.Access

import { Client } from './client.js'
import * as DIDMailto from '@web3-storage/did-mailto'
import * as Result from '../result.js'
import * as Access from '../capability/access.js'

import * as API from '../types.js'

export { DIDMailto }

/**
 * Client for interacting with the `access/*` capabilities.
 *
 * @extends {Client<API.W3Protocol>}
 */
export class AccessClient extends Client {
  /* c8 ignore start - testing websocket code is hard */
  /**
   * Authorize the current agent to use capabilities granted to the passed
   * email account.
   *
   * @deprecated Use `request` instead.
   *
   * @param {`${string}@${string}`} email
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   * @param {Iterable<{ can: API.Ability }>} [options.capabilities]
   */
  async authorize(email, options) {
    const account = DIDMailto.fromEmail(email)
    const authorization = Result.unwrap(await request(this, { account }))
    const access = Result.unwrap(await authorization.claim(options))
    await Result.unwrap(await access.save())

    return access.proofs
  }
  /* c8 ignore stop */

  /**
   * Claim delegations granted to the account associated with this agent.
   *
   * @param {object} [input]
   * @param {API.DID} [input.audience]
   */
  async claim(input) {
    const access = Result.unwrap(await claim(this, input))
    await Result.unwrap(await access.save())
    return access.proofs
  }

  /**
   * Requests specified `access` level from the account from the given account.
   *
   * @param {object} input
   * @param {API.AccountDID} input.account
   * @param {API.Access} [input.access]
   * @param {AbortSignal} [input.signal]
   */
  async request(input) {
    return await request(this, input)
  }

  /**
   * Shares access with delegates.
   *
   * @param {object} input
   * @param {API.Delegation[]} input.delegations
   * @param {API.SpaceDID} [input.space]
   * @param {API.Delegation[]} [input.proofs]
   */
  async delegate(input) {
    return await delegate(this, input)
  }
}

/**
 * @param {{agent: API.AgentView<API.W3Protocol>}} client
 * @param {object} [input]
 * @param {API.DID} [input.audience]
 */
export const claim = async ({ agent }, input) => Access.claim(agent, input)

/**
 * Requests specified `access` level from specified `account`. It will invoke
 * `access/authorize` capability and keep polling `access/claim` capability
 * until access is granted or request is aborted.
 *
 * @param {{agent: API.AgentView<API.W3Protocol>}} agent
 * @param {object} input
 * @param {API.AccountDID} input.account
 * @param {API.Access} [input.access]
 * @param {API.DID} [input.audience]
 */
export const request = async ({ agent }, input) => Access.request(agent, input)

/**
 *
 * @param {{agent: API.AgentView<API.W3Protocol>}} agent
 * @param {object} input
 * @param {API.Delegation[]} input.delegations
 * @param {API.SpaceDID} [input.space]
 * @param {API.Delegation[]} [input.proofs]
 */
export const delegate = async ({ agent }, input) =>
  Access.delegate(agent, input)

export const { spaceAccess, accountAccess } = Access

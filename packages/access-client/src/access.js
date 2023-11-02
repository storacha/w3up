import * as Access from '@web3-storage/capabilities/access'
import * as API from './types.js'
import { Failure, fail } from '@ucanto/core'
import { Agent } from './agent.js'
import { bytesToDelegations } from './encoding.js'

/**
 * Takes array of delegations and propagates them to their respective audiences
 * through a given space (or the current space if none is provided).
 *
 * Returns error result if agent has no current space and no space was provided.
 * Also returns error result if invocation fails.
 *
 * @param {Agent} agent - Agent connected to the w3up service.
 * @param {object} input
 * @param {API.Delegation[]} input.delegations - Delegations to propagate.
 * @param {API.DID} [input.space] - Space to propagate through.
 */
export const delegate = async (
  agent,
  { delegations, space = agent.currentSpace() }
) => {
  if (!space) {
    return fail('Space must be specified')
  }

  const entries = Object.values(delegations).map((proof) => [
    proof.cid.toString(),
    proof.cid,
  ])

  const { out } = await agent.invokeAndExecute(Access.delegate, {
    with: space,
    nb: {
      delegations: Object.fromEntries(entries),
    },
    // must be embedded here because it's referenced by cid in .nb.delegations
    proofs: delegations,
  })

  return out
}

/**
 * Requests specified `access` level from specified `account`. It will invoke
 * `access/authorize` capability and keep polling `access/claim` capability
 * until access is granted or request is aborted.
 *
 * @param {API.Agent} agent
 * @param {object} input
 * @param {API.AccountDID} input.account
 * @param {API.DID} [input.audience]
 * @param {API.Access} [input.access]
 * @returns {Promise<API.Result<PendingAccessRequest, API.AccessAuthorizeFailure|API.InvocationError>>}
 */
export const request = async (
  agent,
  { account, audience = agent.did(), access = spaceAccess }
) => {
  // Request access from the account.
  const { out: result } = await agent.invokeAndExecute(Access.authorize, {
    audience: agent.connection.id,
    with: audience,
    nb: {
      iss: account,
      // New ucan spec moved to recap style layout for capabilities and new
      // `access/request` will use similar format as opposed to legacy one,
      // in the meantime we translate new format to legacy format here.
      att: [...toCapabilities(access)],
    },
  })

  return result.error
    ? result
    : { ok: new PendingAccessRequest({ ...result.ok, agent, audience }) }
}

/**
 * Claims access that has been delegated to the given audience, which by
 * default is the agent's DID.
 *
 * @param {API.Agent} agent
 * @param {object} input
 * @param {API.DID} [input.audience]
 * @returns {Promise<API.Result<API.Delegation[], API.AccessClaimFailure|API.InvocationError>>}
 */
export const claim = async (agent, { audience = agent.did() } = {}) => {
  const { out: result } = await agent.invokeAndExecute(Access.claim, {
    with: audience,
  })

  if (result.error) {
    return result
  } else {
    const delegations = Object.values(result.ok.delegations)
    const proofs = delegations.flatMap((proof) => bytesToDelegations(proof))
    return { ok: proofs }
  }
}

/**
 * Represents a pending access request. It can be used to poll for the requested
 * delegation.
 */
class PendingAccessRequest {
  /**
   * @param {object} source
   * @param {API.Agent} source.agent
   * @param {API.DID} source.audience
   * @param {number} source.expiration
   * @param {API.Link} source.request
   */
  constructor({ agent, audience, expiration, request }) {
    this.agent = agent
    this.audience = audience
    this.expiration = expiration
    this.request = request
  }

  /**
   *
   * @returns {Promise<API.Result<API.Delegation[], API.InvocationError|API.AccessClaimFailure|RequestExpired>>}
   */
  async poll() {
    const { agent, audience, expiration, request } = this
    const timeout = expiration - Date.now()
    if (timeout <= 0) {
      return { error: new RequestExpired({ expiration, request }) }
    } else {
      const result = await claim(agent, { audience })
      return result.error
        ? result
        : { ok: result.ok.filter((proof) => isRequestedAccess(proof, this)) }
    }
  }

  /**
   * @param {object} options
   * @param {number} [options.interval]
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<API.Result<API.Delegation[], Error>>}
   */
  async claim({ signal, interval = 250 } = {}) {
    while (signal?.aborted !== true) {
      const result = await this.poll()
      // If polling failed, return the error.
      if (result.error) {
        return result
      }
      // If we got some matching proofs, return them.
      else if (result.ok.length > 0) {
        return result
      }

      await new Promise((resolve) => setTimeout(resolve, interval))
    }

    return {
      error: Object.assign(new Error('Aborted'), { reason: signal.reason }),
    }
  }
}

class RequestExpired extends Failure {
  /**
   * @param {object} source
   * @param {number} source.expiration
   * @param {API.Link} source.request
   */
  constructor({ request, expiration }) {
    super()
    this.request = request
    this.expiration = expiration
  }

  get name() {
    return 'RequestExpired'
  }

  describe() {
    return `Access request expired at ${new Date(this.expiration)} for ${
      this.request
    } request.`
  }
}

/**
 * Checks if the given delegation is caused by the passed `request` for access.
 *
 * @param {API.Delegation} delegation
 * @param {object} selector
 * @param {API.Link} selector.request
 * @returns
 */

const isRequestedAccess = (delegation, { request }) =>
  delegation.facts.some((fact) => `${fact['access/request']}` === `${request}`)

/**
 * @param {API.Access} access
 * @returns {{ can: API.Ability }[]}
 */
export const toCapabilities = (access) => {
  const abilities = []
  const entries = /** @type {[API.Ability, API.Unit][]} */ (
    Object.entries(access)
  )

  for (const [can, details] of entries) {
    if (details) {
      abilities.push({ can })
    }
  }
  return abilities
}

/**
 * Set of capabilities required for by the agent to manage a space.
 */
export const spaceAccess = {
  'space/*': {},
  'store/*': {},
  'upload/*': {},
  'access/*': {},
  'filecoin/*': {},
}

/**
 * Set of capabilities required for by the agent to manage an account.
 */
export const accountAccess = {
  /**
   * By obtaining `ucan/*` capability an agent can attest UCANs signed by
   * the account and revoke capabilities that were delegated by the account.
   */
  'ucan/*': {},
  'provider/*': {},
}

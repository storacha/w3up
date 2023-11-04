import * as Access from '@web3-storage/capabilities/access'
import * as API from './types.js'
import { Failure, fail, DID } from '@ucanto/core'
import { Agent, importAuthorization } from './agent.js'
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
 * @param {API.SpaceDID} [input.space] - Space to propagate through.
 * @param {API.Delegation[]} [input.proofs]
 */
export const delegate = async (
  agent,
  { delegations, proofs = [], space = agent.currentSpace() }
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
    proofs: [...delegations, ...proofs],
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
 * @param {API.ProviderDID} [input.provider]
 * @param {API.DID} [input.audience]
 * @param {API.Access} [input.access]
 * @returns {Promise<API.Result<PendingAccessRequest, API.AccessAuthorizeFailure|API.InvocationError>>}
 */
export const request = async (
  agent,
  {
    account,
    provider = /** @type {API.ProviderDID} */ (agent.connection.id.did()),
    audience = agent.did(),
    access = spaceAccess,
  }
) => {
  // Request access from the account.
  const { out: result } = await agent.invokeAndExecute(Access.authorize, {
    audience: DID.parse(provider),
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
    : {
        ok: new PendingAccessRequest({
          ...result.ok,
          agent,
          audience,
          provider,
        }),
      }
}

/**
 * Claims access that has been delegated to the given audience, which by
 * default is the agent's DID.
 *
 * @param {API.Agent} agent
 * @param {object} input
 * @param {API.DID} [input.audience]
 * @param {API.ProviderDID} [input.provider]
 * @returns {Promise<API.Result<GrantedAccess, API.AccessClaimFailure|API.InvocationError>>}
 */
export const claim = async (
  agent,
  {
    provider = /** @type {API.ProviderDID} */ (agent.connection.id.did()),
    audience = agent.did(),
  } = {}
) => {
  const { out: result } = await agent.invokeAndExecute(Access.claim, {
    audience: DID.parse(provider),
    with: audience,
  })

  if (result.error) {
    return result
  } else {
    const delegations = Object.values(result.ok.delegations)
    const proofs = delegations.flatMap((proof) => bytesToDelegations(proof))
    return { ok: new GrantedAccess({ agent, provider, audience, proofs }) }
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
   * @param {API.ProviderDID} source.provider
   * @param {API.UTCUnixTimestamp} source.expiration - Seconds in UTC.
   * @param {API.Link} source.request
   */
  constructor({ agent, audience, provider, expiration, request }) {
    this.agent = agent
    this.audience = audience
    this.expiration = expiration
    this.request = request
    this.provider = provider
  }

  /**
   *
   * @returns {Promise<API.Result<API.Delegation[], API.InvocationError|API.AccessClaimFailure|RequestExpired>>}
   */
  async poll() {
    const { agent, audience, provider, expiration, request } = this
    const timeout = expiration - Date.now()
    if (timeout <= 0) {
      return { error: new RequestExpired({ expiration, request }) }
    } else {
      const result = await claim(agent, { audience, provider })
      return result.error
        ? result
        : {
            ok: result.ok.proofs.filter((proof) =>
              isRequestedAccess(proof, this)
            ),
          }
    }
  }

  /**
   * @param {object} options
   * @param {number} [options.interval]
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<API.Result<GrantedAccess, Error>>}
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
        return {
          ok: new GrantedAccess({
            agent: this.agent,
            provider: this.provider,
            audience: this.audience,
            proofs: result.ok,
          }),
        }
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
   * @param {API.UTCUnixTimestamp} source.expiration - Seconds in UTC.
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

class GrantedAccess {
  /**
   * @param {object} source
   * @param {API.Agent} source.agent
   * @param {API.Delegation[]} source.proofs
   * @param {API.ProviderDID} source.provider
   * @param {API.DID} source.audience
   */
  constructor(source) {
    this.source = source
  }
  get proofs() {
    return this.source.proofs
  }
  get provider() {
    return this.source.provider
  }
  get authority() {
    return this.source.audience
  }

  /**
   * @param {object} input
   * @param {API.Agent} [input.agent]
   */
  save({ agent = this.source.agent } = {}) {
    return importAuthorization(agent, this)
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
  '*': {},
}

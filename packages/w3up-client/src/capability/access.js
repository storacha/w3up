import { Base } from '../base.js'
import * as Access from '@web3-storage/capabilities/access'
import * as DIDMailto from '@web3-storage/did-mailto'
import * as Result from '../result.js'
import { Failure, DID } from '@ucanto/core'
import { bytesToDelegations } from '../agent/encoding.js'
import { importAuthorization } from '../agent.js'
import * as API from '../agent/types.js'

export { DIDMailto }

/**
 * Client for interacting with the `access/*` capabilities.
 */
export class AccessClient extends Base {
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
    const authorization = Result.unwrap(await request(this.agent, { account }))
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
    const access = Result.unwrap(await claim(this.agent, input))
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
    return await request(this.agent, input)
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
    return await delegate(this.agent, input)
  }
}

/**
 * Takes array of delegations and propagates them to their respective audiences
 * through a given space (or the current space if none is provided).
 *
 * Returns error result if agent has no current space and no space was provided.
 * Also returns error result if invocation fails.
 *
 * @param {API.Agent} agent - Agent connected to the w3up service.
 * @param {object} input
 * @param {API.Delegation[]} input.delegations - Delegations to propagate.
 * @param {API.SpaceDID} [input.space] - Space to propagate through.
 * @param {API.Delegation[]} [input.proofs] - Optional set of proofs to be
 * included in the invocation.
 */
export const delegate = async (
  agent,
  { delegations, proofs = [], space = agent.currentSpace() }
) => {
  /* c8 ignore next 3 */
  if (!space) {
    return Result.fail('Space must be specified')
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
 * Requests specified `access` level from specified `account`. It invokes
 * `access/authorize` capability, if invocation succeeds it will return a
 * `PendingAccessRequest` object that can be used to poll for the requested
 * delegation through `access/claim` capability.
 *
 * @param {API.Agent} agent
 * @param {object} input
 * @param {API.AccountDID} input.account - Account from which access is requested.
 * @param {API.ProviderDID} [input.provider] - Provider that will receive the invocation.
 * @param {API.DID} [input.audience] - Principal requesting an access.
 * @param {API.Access} [input.access] - Access been requested.
 * @returns {Promise<API.Result<PendingAccessRequest, API.AccessAuthorizeFailure|API.InvocationError>>}
 */
export const request = async (
  agent,
  {
    account,
    provider = /** @type {API.ProviderDID} */ (agent.connection.id.did()),
    audience: audience = agent.did(),
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
    ? /* c8 ignore next */
      result
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
 * @param {API.DID} [input.audience] - Principal requesting an access.
 * @param {API.ProviderDID} [input.provider] - Provider handling the invocation.
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

  /* c8 ignore next 2 */
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
   * @typedef {object} PendingAccessRequestModel
   * @property {API.Agent} agent - Agent handling interaction.
   * @property {API.DID} audience - Principal requesting an access.
   * @property {API.ProviderDID} provider - Provider handling request.
   * @property {API.UTCUnixTimestamp} expiration - Seconds in UTC.
   * @property {API.Link} request - Link to the `access/authorize` invocation.
   *
   * @param {PendingAccessRequestModel} model
   */
  constructor(model) {
    this.model = model
  }

  get agent() {
    return this.model.agent
  }
  get audience() {
    return this.model.audience
  }
  get expiration() {
    return new Date(this.model.expiration * 1000)
  }

  get request() {
    return this.model.request
  }

  get provider() {
    return this.model.provider
  }

  /**
   * Low level method and most likely you want to use `.claim` instead. This method will poll
   * fetch delegations **just once** and will return proofs matching to this request. Please note
   * that there may not be any matches in which case result will be `{ ok: [] }`.
   *
   * If you do want to continuously poll until request is approved or expired, you should use
   * `.claim` method instead.
   *
   * @returns {Promise<API.Result<API.Delegation[], API.InvocationError|API.AccessClaimFailure|RequestExpired>>}
   */
  async poll() {
    const { agent, audience, provider, expiration } = this.model
    const timeout = expiration * 1000 - Date.now()
    /* c8 ignore next 2 */
    if (timeout <= 0) {
      return { error: new RequestExpired(this.model) }
    } else {
      const result = await claim(agent, { audience, provider })
      return result.error
        ? /* c8 ignore next */
          result
        : {
            ok: result.ok.proofs.filter((proof) =>
              isRequestedAccess(proof, this.model)
            ),
          }
    }
  }

  /**
   * Continuously polls delegations until this request is approved or expired. Returns
   * a `GrantedAccess` object (view over the delegations) that can be used in the
   * invocations or can be saved in the agent (store) using `.save()` method.
   *
   * @param {object} options
   * @param {number} [options.interval]
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<API.Result<GrantedAccess, Error>>}
   */
  async claim({ signal, interval = 250 } = {}) {
    /* c8 ignore next */
    while (signal?.aborted !== true) {
      const result = await this.poll()
      // If polling failed, return the error.
      /* c8 ignore next 3 */
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
    /* c8 ignore next 4 */
    return {
      error: Object.assign(new Error('Aborted'), { reason: signal.reason }),
    }
  }
}

/**
 * Error returned when pending access request expires.
 */
class RequestExpired extends Failure {
  /**
   * @param {PendingAccessRequestModel} model
   */
  /* c8 ignore next 4 */
  constructor(model) {
    super()
    this.model = model
  }

  /* c8 ignore next 4 */
  get name() {
    return 'RequestExpired'
  }

  /* c8 ignore next 3 */
  get request() {
    return this.model.request
  }

  /* c8 ignore next 3 */
  get expiredAt() {
    return new Date(this.model.expiration * 1000)
  }

  /* c8 ignore next 3 */
  describe() {
    return `Access request expired at ${this.expiredAt} for ${this.request} request.`
  }
}

/**
 * View over the UCAN Delegations that grant access to a specific principal.
 */
class GrantedAccess {
  /**
   * @typedef {object} GrantedAccessModel
   * @property {API.Agent} agent - Agent that processed the request.
   * @property {API.DID} audience - Principal access was granted to.
   * @property {API.Delegation[]} proofs - Delegations that grant access.
   * @property {API.ProviderDID} provider - Provider that handled the request.
   *
   * @param {GrantedAccessModel} model
   */
  constructor(model) {
    this.model = model
  }
  get proofs() {
    return this.model.proofs
  }
  get provider() {
    return this.model.provider
  }
  get authority() {
    return this.model.audience
  }

  /**
   * Saves access into the agents proofs store so that it can be retained
   * between sessions.
   *
   * @param {object} input
   * @param {API.Agent} [input.agent]
   */
  save({ agent = this.model.agent } = {}) {
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
  // `access/confirm` handler adds facts to the delegation issued by the account
  // so that principal requesting access can identify correct delegation when
  // access is granted.
  delegation.facts.some((fact) => `${fact['access/request']}` === `${request}`)

/**
 * Maps access object that uses UCAN 0.10 capabilities format as opposed
 * to legacy UCAN 0.9 format used by w3up  which predates new format.
 *
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
 * Set of capabilities required by the agent to manage a space.
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

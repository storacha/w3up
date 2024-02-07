import * as DIDMailto from '@web3-storage/did-mailto'

import * as API from './types.js'

export { DIDMailto }

import * as Access from '@web3-storage/capabilities/access'
import { Failure, fail, DID } from '@ucanto/core'
import { bytesToDelegations } from './agent/encoding.js'
import * as Authorization from './agent/authorization.js'
import * as DB from './agent/db.js'

/**
 * Takes array of delegations and propagates them to their respective audiences
 * through a given space (or the current space if none is provided).
 *
 * Returns error result if agent has no current space and no space was provided.
 * Also returns error result if invocation fails.
 *
 * @param {API.Session<API.AccessService>} session - w3up service session.
 * @param {object} input
 * @param {API.Delegation[]} input.delegations - Delegations to propagate.
 * @param {API.SpaceDID} [input.subject] - Space to propagate through.
 * @param {API.Delegation[]} [input.proofs] - Optional set of proofs to be
 * included in the invocation.
 */
export const delegate = async (
  session,
  { delegations, proofs = [], subject }
) => {
  if (!subject) {
    return fail('Space must be specified')
  }

  const entries = Object.values(delegations).map((proof) => [
    proof.cid.toString(),
    proof.cid,
  ])

  const auth = Authorization.get(session.agent.db, {
    authority: session.agent.did(),
    subject,
    can: { 'access/delegate': [] },
  })

  if (auth.error) {
    return auth
  }

  const { out } = await Access.delegate
    .invoke({
      issuer: session.agent.signer,
      audience: session.connection.id,
      with: subject,
      nb: {
        delegations: Object.fromEntries(entries),
      },
      // must be embedded here because it's referenced by cid in .nb.delegations
      proofs: [...auth.ok.proofs, ...delegations],
    })
    .execute(session.connection)

  return out
}

/**
 * Requests specified `access` level from specified `account`. It invokes
 * `access/authorize` capability, if invocation succeeds it will return a
 * `PendingAccessRequest` object that can be used to poll for the requested
 * delegation through `access/claim` capability.
 *
 * @param {API.Session<API.AccessService>} session
 * @param {object} input
 * @param {API.AccountDID} input.account - Account from which access is requested.
 * @param {API.DIDKey|API.DidMailto} [input.authority] - Principal requesting access.
 * @param {API.ProviderDID} [input.provider] - Provider that will receive the invocation.
 * @param {API.Can} [input.can] - Capabilities been requested.
 * @returns {Promise<API.Result<PendingAccessRequest, API.AccessAuthorizeFailure|API.AccessDenied|API.InvocationError>>}
 */
export const request = async (
  session,
  {
    account,
    authority = session.agent.did(),
    provider = /** @type {API.ProviderDID} */ (session.connection.id.did()),
    can = spaceAccess,
  }
) => {
  // Find proofs that allows this agent to invoke `access/authorize` capability
  // on behalf of the principal requesting access.
  const auth = Authorization.get(session.agent.db, {
    authority: session.agent.did(),
    subject: authority,
    can: { 'access/authorize': [] },
  })

  if (auth.error) {
    return auth
  }

  // Build an invocation and execute it.
  const { out: result } = await Access.authorize
    .invoke({
      issuer: session.agent.signer,
      audience: DID.parse(provider),
      with: authority,
      nb: {
        iss: account,
        // New ucan spec moved to recap style layout for capabilities and new
        // `access/request` will use similar format as opposed to legacy one,
        // in the meantime we translate new format to legacy format here.
        att: [...toCapabilities(can)],
      },
      proofs: auth.ok.proofs,
    })
    .execute(session.connection)

  return result.error
    ? result
    : {
        ok: new PendingAccessRequest({
          ...result.ok,
          authority,
          session,
          provider,
        }),
      }
}

/**
 * Claims access that has been delegated to the given `authority`, which by
 * default is the agent's DID.
 *
 * @param {API.Session<API.AccessService>} session
 * @param {object} input
 * @param {API.DIDKey|API.DidMailto} [input.authority] - Principal claiming an access.
 * @param {API.ProviderDID} [input.provider] - Provider handling the invocation.
 * @returns {Promise<API.Result<GrantedAccess, API.AccessClaimFailure|API.InvocationError|API.AccessDenied>>}
 */
export const claim = async (
  session,
  {
    provider = /** @type {API.ProviderDID} */ (session.connection.id.did()),
    authority = session.agent.did(),
  } = {}
) => {
  const auth = Authorization.get(session.agent.db, {
    authority: session.agent.did(),
    subject: authority,
    can: { 'access/claim': [] },
  })

  if (auth.error) {
    return auth
  }

  const { out: result } = await Access.claim
    .invoke({
      issuer: session.agent.signer,
      audience: DID.parse(provider),
      with: authority,
      proofs: auth.ok.proofs,
    })
    .execute(session.connection)

  if (result.error) {
    return result
  } else {
    const delegations = Object.values(result.ok.delegations)

    const proofs = /** @type {API.Tuple<API.Delegation>} */ (
      delegations.flatMap((proof) => bytesToDelegations(proof))
    )

    return { ok: new GrantedAccess({ session, proofs }) }
  }
}

/**
 * Represents a pending access request. It can be used to poll for the requested
 * delegation.
 */
class PendingAccessRequest {
  /**
   * @typedef {object} PendingAccessRequestModel
   * @property {API.Session<API.AccessService>} session - Session with a service.
   * @property {API.ProviderDID} provider - Provider handling request.
   * @property {API.UTCUnixTimestamp} expiration - Seconds in UTC.
   * @property {API.DIDKey|API.DidMailto} authority - Principal requesting an access.
   * @property {API.Link} request - Link to the `access/authorize` invocation.
   *
   * @param {PendingAccessRequestModel} model
   */
  constructor(model) {
    this.model = model
  }

  get session() {
    return this.model.session
  }
  get expiration() {
    return new Date(this.model.expiration * 1000)
  }

  get request() {
    return this.model.request
  }

  get authority() {
    return this.model.authority
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
   * @returns {Promise<API.Result<API.Delegation[], API.InvocationError|API.AccessClaimFailure|RequestExpired|API.AccessDenied>>}
   */
  async poll() {
    const { session, provider, expiration, authority } = this.model
    const timeout = expiration * 1000 - Date.now()
    if (timeout <= 0) {
      return { error: new RequestExpired(this.model) }
    } else {
      const result = await claim(session, { authority, provider })
      return result.error
        ? result
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
            session: this.session,
            proofs: /** @type {API.Tuple<API.Delegation>} */ (result.ok),
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

/**
 * Error returned when pending access request expires.
 */
class RequestExpired extends Failure {
  /**
   * @param {PendingAccessRequestModel} model
   */
  constructor(model) {
    super()
    this.model = model
  }

  get name() {
    return 'RequestExpired'
  }

  get request() {
    return this.model.request
  }
  get expiredAt() {
    return new Date(this.model.expiration * 1000)
  }

  describe() {
    return `Access request expired at ${this.expiredAt} for ${this.request} request.`
  }
}

/**
 * View over the UCAN Delegations that grant access to a specific principal.
 */
export class GrantedAccess {
  /**
   * @typedef {object} GrantedAccessModel
   * @property {API.Session<API.AccessService>} session - Agent that processed the request.
   * @property {API.Tuple<API.Delegation>} proofs - Delegations that grant access.
   *
   * @param {GrantedAccessModel} model
   */
  constructor(model) {
    this.model = model
  }
  get proofs() {
    return this.model.proofs
  }

  /**
   * Saves access into the agents proofs store so that it can be retained
   * between sessions.
   *
   * @param {object} input
   * @param {API.Agent} [input.agent]
   */
  save({ agent = this.model.session.agent } = {}) {
    return DB.transact(
      agent.db,
      this.proofs.map((proof) => DB.assert({ proof }))
    )
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
 * @param {API.Can} access
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
  'space/*': [],
  'store/*': [],
  'upload/*': [],
  'access/*': [],
  'filecoin/*': [],
  'usage/*': [],
}

/**
 * Set of capabilities required for by the agent to manage an account.
 */
export const accountAccess = {
  '*': [],
}

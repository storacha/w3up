import * as DIDMailto from '@web3-storage/did-mailto'

import * as API from './types.js'

export { DIDMailto }

import * as Access from '@web3-storage/capabilities/access'
import { Failure, DID } from '@ucanto/core'
import { bytesToDelegations } from './agent/encoding.js'
import * as DB from './agent/db.js'
import * as Agent from './agent.js'
import * as Task from './task.js'
import * as Session from './session.js'

/**
 * Takes array of delegations and propagates them to their respective audiences
 * through a given space (or the current space if none is provided).
 *
 * Returns error result if agent has no current space and no space was provided.
 * Also returns error result if invocation fails.
 *
 * @param {API.Session<API.AccessProtocol>} session - w3up service session.
 * @param {object} input
 * @param {API.Delegation[]} input.delegations - Delegations to propagate.
 * @param {API.SpaceDID} input.subject - Space to propagate through.
 * @returns {Task.Task<API.Receipt<API.Unit, API.AccessDelegateFailure | API.InvocationError>, API.AccessDenied | API.OfflineError>}
 */
export function* delegate(session, { delegations, subject }) {
  const entries = Object.values(delegations).map((proof) => [
    proof.cid.toString(),
    proof.cid,
  ])

  const { proofs } = yield* Agent.authorize(session.agent, {
    subject,
    can: { 'access/delegate': [] },
  })

  const task = Access.delegate.invoke({
    issuer: session.agent.signer,
    audience: session.connection.id,
    with: subject,
    nb: {
      delegations: Object.fromEntries(entries),
    },
    // must be embedded here because it's referenced by cid in .nb.delegations
    proofs: [...proofs, ...delegations],
  })

  return yield* Session.execute(session, task).receipt()
}

/**
 * Requests specified `access` level from specified `account`. It invokes
 * `access/authorize` capability, if invocation succeeds it will return a
 * `PendingAccessRequest` object that can be used to poll for the requested
 * delegation through `access/claim` capability.
 *
 * @param {API.Session<API.AccessRequestProvider>} session
 * @param {object} input
 * @param {API.AccountDID} input.account - Account from which access is requested.
 * @param {API.DIDKey|API.DidMailto} [input.authority] - Principal requesting access.
 * @param {API.ProviderDID} [input.provider] - Provider that will receive the invocation.
 * @param {API.Can} [input.can] - Capabilities been requested.

 */
export function* request(
  session,
  {
    account,
    authority = /** @type {API.DIDKey} */ (session.agent.signer.did()),
    provider = /** @type {API.ProviderDID} */ (session.connection.id.did()),
    can = spaceAccess,
  }
) {
  // Find proofs that allows this agent to invoke `access/authorize` capability
  // on behalf of the principal requesting access.
  const { proofs } = yield* Agent.authorize(session.agent, {
    subject: authority,
    can: { 'access/authorize': [] },
  })

  // Build an invocation and execute it.
  const task = Access.authorize.invoke({
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
    proofs,
  })

  const receipt = yield* Session.execute(session, task).receipt()
  if (!receipt.out.ok) {
    return yield* Task.fail(receipt.out.error)
  }

  const { request, expiration } = receipt.out.ok

  return new PendingAccessRequest({
    request,
    receipt,
    expiration,
    authority,
    session,
    provider,
  })
}

/**
 * Claims access that has been delegated to the given `authority`, which by
 * default is the agent's DID.
 *
 * @param {API.Session<API.AccessClaimProvider>} session
 * @param {object} input
 * @param {API.DIDKey|API.DidMailto} [input.authority] - Principal claiming an access.
 * @param {API.ProviderDID} [input.provider] - Provider handling the invocation.
 */
export function* claim(
  session,
  {
    provider = /** @type {API.ProviderDID} */ (session.connection.id.did()),
    authority = /** @type {API.DIDKey} */ (session.agent.signer.did()),
  } = {}
) {
  const auth = yield* Agent.authorize(session.agent, {
    subject: authority,
    can: { 'access/claim': [] },
  })

  const task = Access.claim.invoke({
    issuer: session.agent.signer,
    audience: DID.parse(provider),
    with: authority,
    proofs: auth.proofs,
  })

  const receipt = yield* Session.execute(session, task).receipt()

  const { delegations } = yield* Task.ok(receipt.out)

  const proofs = /** @type {API.Tuple<API.Delegation>} */ (
    Object.values(delegations).flatMap((proof) => bytesToDelegations(proof))
  )

  return new GrantedAccess({ agent: session.agent, receipt, proofs })
}

/**
 * @typedef {object} PendingAccessRequestModel
 * @property {API.Session<API.AccessClaimProvider>} session - Session with a service.
 * @property {API.Receipt<API.AccessAuthorizeSuccess, API.AccessAuthorizeFailure>} receipt - Receipt of the `access/authorize` invocation.
 * @property {API.ProviderDID} provider - Provider handling request.
 * @property {API.UTCUnixTimestamp} expiration - Seconds in UTC.
 * @property {API.DIDKey|API.DidMailto} authority - Principal requesting an access.
 * @property {API.Link} request - Link to the `access/authorize` invocation.
 */

/**
 * Represents a pending access request. It can be used to poll for the requested
 * delegation.
 *
 */
class PendingAccessRequest {
  /**
   
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

  receipt() {
    return this.model.receipt
  }

  /**
   * Low level method and most likely you want to use `.claim` instead. This method will poll
   * fetch delegations **just once** and will return proofs matching to this request. Please note
   * that there may not be any matches in which case result will be `{ ok: [] }`.
   *
   * If you do want to continuously poll until request is approved or expired, you should use
   * `.claim` method instead.
   *
   * @returns {Task.Invocation<GrantedAccess, API.InvocationError|API.AccessClaimFailure|RequestExpired|API.AccessDenied|Task.AbortError>}
   */
  poll() {
    return Task.perform(PendingAccessRequest.poll(this))
  }

  /**
   * Continuously polls delegations until this request is approved or expired. Returns
   * a `GrantedAccess` object (view over the delegations) that can be used in the
   * invocations or can be saved in the agent (store) using `.save()` method.
   *
   * @param {object} [options]
   * @param {number} [options.interval]
   * @param {AbortSignal} [options.signal]
   * @returns {Task.Invocation<GrantedAccess, Error>}
   */
  claim(options) {
    return Task.perform(PendingAccessRequest.claim(this, options))
  }

  /**
   * @param {PendingAccessRequest} self
   */
  static *poll(self) {
    const { session, provider, expiration, authority } = self.model
    const timeout = expiration * 1000 - Date.now()
    if (timeout <= 0) {
      return yield* Task.fail(new RequestExpired(self.model))
    } else {
      return yield* claim(session, { authority, provider })
    }
  }

  /**
   * @param {PendingAccessRequest} self
   * @param {object} options
   * @param {number} [options.interval]
   * @param {AbortSignal} [options.signal]
   * @returns {Task.Task<GrantedAccess, Error>}
   */
  static *claim(self, { signal, interval = 250 } = {}) {
    while (signal?.aborted !== true) {
      const access = yield* this.poll(self)

      const proofs = /** @type {API.Tuple<API.Delegation>} */ (
        access.proofs.filter((proof) => isRequestedAccess(proof, self.model))
      )

      // If we got some matching proofs, return them.
      if (proofs.length > 0) {
        return new GrantedAccess({
          agent: self.session.agent,
          proofs,
          receipt: access.receipt(),
        })
      }

      yield* Task.sleep(interval)
    }

    return yield* Task.fail(
      /** @type {Error & {reason:unknown}} */ (
        new Error('Aborted'), { reason: signal.reason }
      )
    )
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
   * @property {API.Agent} agent - Agent that processed the request.
   * @property {API.Tuple<API.Delegation>} proofs - Delegations that grant access.
   * @property {API.Receipt<API.AccessClaimSuccess>} receipt
   *
   * @param {GrantedAccessModel} model
   */
  constructor(model) {
    this.model = model
  }

  receipt() {
    return this.model.receipt
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
  save({ agent = this.model.agent } = {}) {
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

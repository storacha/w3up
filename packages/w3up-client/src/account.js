import * as API from './types.js'
import * as Account from './account/query.js'
import * as Access from './access.js'
import * as DB from './agent/db.js'
import * as DIDMailto from '@web3-storage/did-mailto'
import * as Plan from './account/plan.js'
import * as Space from './space.js'

export { DIDMailto }

/**
 * @template {API.AccessRequestProvider & API.PlanProtocol & API.ProviderProtocol & API.SubscriptionProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} session
 * @returns {API.AccountsSession<Protocol>}
 */
export const view = (session) => new AccountsView(session)

/**
 * @template {API.AccessRequestProvider & API.PlanProtocol & API.ProviderProtocol & API.SubscriptionProtocol} [Protocol=API.W3UpProtocol]
 */
export class AccountsView {
  /**
   * @param {API.Session<Protocol>} session
   */
  constructor(session) {
    this.session = session
    this.spaces = Space.view(/** @type {API.Session<any>} */ (this.session))
  }

  *[Symbol.iterator]() {
    yield* Object.values(list(this.session))
  }

  /**
   * @param {object} source
   * @param {API.EmailAddress} source.email
   * @param {AbortSignal} [source.signal]
   */
  login(source) {
    return login(this.session, source)
  }

  /**
   * Returns iterable of all the accounts saved in the agent's database.
   */
  list() {
    return list(this.session)
  }

  /**
   * Gets an account view for the login with a given email address stored in the
   * agent's database. Returns `undefined` if no matching login is found.
   *
   * @param {API.EmailAddress} email
   */
  get(email) {
    return get(this.session, email)
  }

  /**
   * @param {API.AccountSession<API.UnknownProtocol>} account
   */
  add(account) {
    return add(this.session, account)
  }

  /**
   * @param {API.AccountSession<API.UnknownProtocol>} account
   */
  remove(account) {
    return remove(this.session, account)
  }
}

/**
 * @template {API.AccessRequestProvider & API.PlanProtocol & API.ProviderProtocol & API.SubscriptionProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} session
 * @param {object} source
 * @param {API.EmailAddress} source.email
 * @param {AbortSignal} [source.signal]
 * @returns {Promise<API.Result<AccountSession<Protocol>, API.AccessDenied|API.InvocationError|API.AccessAuthorizeFailure>>}
 */
export const login = async (session, { email, signal }) => {
  const account = get(session, email)
  if (account) {
    return { ok: account }
  }

  const id = DIDMailto.fromEmail(email)
  const { ok: access, error } = await Access.request(session, {
    account: id,
    can: Access.accountAccess,
  })

  /* c8 ignore next 2 - don't know how to test this */
  if (error) {
    return { error }
  } else {
    const { ok, error } = await access.claim({ signal })
    /* c8 ignore next 2 - don't know how to test this */
    if (error) {
      return { error }
    } else {
      const login = { id, attestations: new Map(), proofs: new Map() }
      for (const proof of ok.proofs) {
        if (proof.capabilities?.[0].can === 'ucan/attest') {
          login.attestations.set(`${proof.cid}`, proof)
        } else {
          login.proofs.set(`${proof.cid}`, proof)
        }
      }

      return {
        ok: AccountSession.from({ session, login }),
      }
    }
  }
}

/**
 * @template {API.PlanProtocol & API.ProviderProtocol & API.SubscriptionProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} session
 * @returns {Record<API.AccountDID, AccountSession<Protocol>>}
 */

export const list = (session) => {
  const matches = Account.select(
    session.agent.db,
    DB.query(
      session.agent.db.index,
      Account.query({ audience: session.agent.signer.did() })
    )
  )

  return Object.fromEntries(
    [...matches].map(([account, login]) => [
      account,
      AccountSession.from({ session, login }),
    ])
  )
}

/**
 * Gets the account view for the login with a given email address. Returns
 * `undefined` if no matching login is found.
 *
 * @template {API.PlanProtocol & API.ProviderProtocol & API.SubscriptionProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} session
 * @param {API.EmailAddress} email
 */
export const get = (session, email) => {
  const account = DIDMailto.fromEmail(email)
  const [login] = Account.select(
    session.agent.db,
    DB.query(
      session.agent.db.index,
      Account.query({ audience: session.agent.signer.did(), account })
    )
  ).values()

  return login ? AccountSession.from({ session, login }) : undefined
}

/**
 * Stores account into in the agent's database so it is retained between
 * sessions.
 *
 * ⚠️ If agent provided is not the agent authorized by the account stored
 * account will not be listed until session is created with an authorized agent.
 *
 * @param {object} session
 * @param {API.Agent} session.agent
 * @param {API.AccountSession<API.UnknownProtocol>} account
 */
export const add = async ({ agent }, account) => {
  return await DB.transact(
    agent.db,
    [...account.proofs].map((proof) => DB.assert({ proof }))
  )
}

/**
 * Removes access to this account from the agent's database.
 *
 * @param {object} session
 * @param {API.Agent} session.agent
 * @param {API.AccountSession<API.UnknownProtocol>} account
 */
export const remove = async ({ agent }, account) => {
  return DB.transact(
    agent.db,
    [...account.proofs].map((proof) => DB.retract({ proof }))
  )
}

/**
 * @template {API.PlanProtocol & API.ProviderProtocol & API.SubscriptionProtocol} [Protocol=API.W3UpProtocol]
 */
class AccountSession {
  /**
   * @template {API.PlanProtocol & API.ProviderProtocol & API.SubscriptionProtocol} [Protocol=API.W3UpProtocol]
   * @param {object} source
   * @param {object} source.login
   * @param {API.DidMailto} source.login.id
   * @param {Map<string, API.Delegation>} source.login.proofs
   * @param {Map<string, API.Delegation>} source.login.attestations
   * @param {API.Session<Protocol>} source.session
   */
  static from({ login, session }) {
    return new AccountSession({
      id: login.id,
      session: {
        agent: {
          signer: session.agent.signer,
          db: DB.fromProofs([
            ...login.proofs.values(),
            ...login.attestations.values(),
          ]),
        },
        connection: session.connection,
      },
    })
  }

  /**
   * @param {object} source
   * @param {API.DidMailto} source.id
   * @param {API.Session<Protocol>} source.session
   */
  constructor(source) {
    this.model = source

    /** @type {API.AccountPlans<Protocol>} */
    this.plans = Plan.from(this)

    this.spaces = Space.view(/** @type {API.Session<any>} */ (this.session))
  }
  get session() {
    return this.model.session
  }
  did() {
    return this.model.id
  }

  /**
   * @returns {API.EmailAddress}
   */
  toEmail() {
    return DIDMailto.toEmail(this.did())
  }

  get proofs() {
    return [...this.model.session.agent.db.proofs.values()].map(
      ($) => $.delegation
    )
  }

  toJSON() {
    return {
      email: this.toEmail(),
      proofs: [...this.proofs],
    }
  }
}

import * as API from './types.js'
import * as Login from './agent/login.js'
import * as Access from './access.js'
import * as DB from './agent/db.js'
import * as DIDMailto from '@web3-storage/did-mailto'
import * as Plan from './account/plan.js'

export { DIDMailto }
/**
 * @template {API.AccessRequestProvider & API.PlanProtocol & API.ProviderProtocol} [Protocol=API.W3UpProtocol]
 */
export class AccountsView {
  /**
   * @param {API.Session<Protocol>} session
   */
  constructor(session) {
    this.session = session
  }

  [Symbol.iterator]() {
    return list(this.session)
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
}

/**
 * @template {API.AccessRequestProvider & API.PlanProtocol & API.ProviderProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} session
 * @param {object} source
 * @param {API.EmailAddress} source.email
 * @param {AbortSignal} [source.signal]
 * @returns {Promise<API.Result<AccountView<Protocol>, API.AccessDenied|API.InvocationError|API.AccessAuthorizeFailure>>}
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
      const login = Login.from({ account: id })
      for (const proof of ok.proofs) {
        if (proof.capabilities?.[0].can === 'ucan/attest') {
          login.attestations.set(`${proof.cid}`, proof)
        } else {
          login.proofs.set(`${proof.cid}`, proof)
        }
      }
      return { ok: new AccountView({ session, login }) }
    }
  }
}

/**
 * @template {API.PlanProtocol & API.ProviderProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} session
 * @returns {Record<API.AccountDID, AccountView<Protocol>>}
 */

export const list = (session) => {
  const logins = Login.select(
    session.agent.db,
    DB.query(
      session.agent.db.index,
      Login.query({ authority: session.agent.did() })
    )
  )

  return Object.fromEntries(
    [...logins].map(([account, login]) => [
      account,
      new AccountView({ session, login }),
    ])
  )
}

/**
 * Gets the account view for the login with a given email address. Returns
 * `undefined` if no matching login is found.
 *
 * @template {API.PlanProtocol & API.ProviderProtocol & API.ProviderProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} session
 * @param {API.EmailAddress} email
 */
export const get = (session, email) => {
  const account = DIDMailto.fromEmail(email)
  const [login] = Login.select(
    session.agent.db,
    DB.query(
      session.agent.db.index,
      Login.query({ authority: session.agent.did(), account })
    )
  ).values()

  return login ? new AccountView({ session, login }) : undefined
}

/**
 * @template {API.PlanProtocol & API.ProviderProtocol} [Protocol=API.W3UpProtocol]
 */
class AccountView {
  /**
   * @param {object} source
   * @param {API.Session<Protocol>} source.session
   * @param {object} source.login
   * @param {Map<string, API.Delegation>} source.login.proofs
   * @param {Map<string, API.Delegation>} source.login.attestations
   * @param {API.DidMailto} source.login.id
   */
  constructor(source) {
    this.model = source

    this.plans = Plan.from(this)
  }
  get session() {
    return this.model.session
  }
  did() {
    return this.model.login.id
  }

  /**
   * @returns {API.EmailAddress}
   */
  toEmail() {
    return DIDMailto.toEmail(this.did())
  }

  get proofs() {
    return [
      ...this.model.login.proofs.values(),
      ...this.model.login.attestations.values(),
    ]
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
      [...this.proofs].map((proof) => DB.assert({ proof }))
    )
  }

  /**
   * Deletes access to this account from the agent's proofs store.
   *
   * @param {object} input
   * @param {API.Agent} [input.agent]
   */
  delete({ agent = this.model.session.agent } = {}) {
    return DB.transact(
      agent.db,
      [...this.proofs].map((proof) => DB.retract({ proof }))
    )
  }

  toJSON() {
    return {
      email: this.toEmail(),
      proofs: [...this.proofs],
    }
  }
}

import * as API from './types.js'
import * as DB from './agent/db.js'
import * as DIDMailto from '@web3-storage/did-mailto'
import * as Space from './space.js'
import * as Task from './task.js'
import * as Account from './account/account.js'

export { DIDMailto }

export { login, list, get } from './account/account.js'

/**
 * @template {API.AccountProtocol & API.AccessRequestProvider} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} session
 * @returns {API.AccountManager<Protocol>}
 */
export const view = (session) => new AccountsView(session)

/**
 * @template {API.AccountProtocol & API.AccessRequestProvider} [Protocol=API.W3UpProtocol]
 * @implements {API.AccountManager<Protocol>}
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
    yield* Object.values(Account.list(this.session))
  }

  /**
   * @param {object} source
   * @param {API.EmailAddress} source.email
   * @param {AbortSignal} [source.signal]
   */
  login(source) {
    return Task.perform(Account.login(this.session, source))
  }

  /**
   * Returns iterable of all the accounts saved in the agent's database.
   */
  list() {
    return Account.list(this.session)
  }

  /**
   * Gets an account view for the login with a given email address stored in the
   * agent's database. Returns `undefined` if no matching login is found.
   *
   * @param {API.EmailAddress} email
   */
  get(email) {
    return Account.get(this.session, email)
  }

  /**
   * @param {API.AccountView} account
   */
  add(account) {
    return Task.perform(add(this.session, account))
  }

  /**
   * @param {API.AccountView} account
   */
  remove(account) {
    return Task.perform(remove(this.session, account))
  }
}

/**
 * Stores account into in the agent's database so it is retained between
 * sessions.
 *
 * ⚠️ If agent provided is not the agent authorized by the account stored
 * account will not be listed until session is created with an authorized agent.
 *
 * @param {API.Session<API.UnknownProtocol>} session
 * @param {API.AccountView} account
 */
export function* add({ agent }, account) {
  yield* DB.transact(
    agent.db,
    [...account.proofs].map((proof) => DB.assert({ proof }))
  )

  return {}
}

/**
 * Removes access to this account from the agent's database.
 *
 * @param {API.Session<API.UnknownProtocol>} session
 * @param {API.AccountView} account
 */
export function* remove({ agent }, account) {
  yield* DB.transact(
    agent.db,
    [...account.proofs].map((proof) => DB.retract({ proof }))
  )

  return {}
}

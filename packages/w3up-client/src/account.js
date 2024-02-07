import * as API from './types.js'
import * as Account from './agent/account.js'
import * as DB from './agent/db.js'
import { fromEmail, toEmail } from '@web3-storage/did-mailto'

/**
 * @template {API.UnknownProtocol} [Protocol=API.Service]
 * @typedef {object} Model
 * @property {API.Session<Protocol>} session
 */

/**
 * @template {API.UnknownProtocol} [Protocol=API.Service]
 */
export class AccountsView {
  /**
   * @param {Model<Protocol>} model
   */
  constructor(model) {
    this.model = model
  }
  get session() {
    return this.model.session
  }

  [Symbol.iterator]() {
    return list(this)
  }

  /**
   * @param {object} source
   * @param {API.EmailAddress} source.email
   * @param {AbortSignal} [source.signal]
   */
  login(source) {
    return login(this, source)
  }

  /**
   * Returns iterable of all the accounts saved in the agent's database.
   */
  list() {
    return list(this)
  }

  /**
   * Gets an account view for the login with a given email address stored in the
   * agent's database. Returns `undefined` if no matching login is found.
   *
   * @param {API.EmailAddress} email
   */
  get(email) {
    return get(this, email)
  }

  /**
   * Removes all the delegations corresponding to the account logins for the
   * given email address.
   *
   * @param {object} account
   * @param {API.EmailAddress} account.email
   */
  remove({ email }) {
    return remove(this, email)
  }
}

/**
 * @template {API.UnknownProtocol} [Protocol=API.Service]
 * @param {Model<Protocol>} param0
 * @param {object} source
 * @param {API.EmailAddress} source.email
 * @param {AbortSignal} [source.signal]
 */
export const login = async ({ session }, { email, signal }) => {
  const login = get({ session }, email)
  if (login) {
    return { ok: login }
  }

  const result = await Access.request(session, {
    account: id,
    access: Access.accountAccess,
  })
}

/**
 * @template {API.UnknownProtocol} [Protocol=API.Service]
 * @param {Model<Protocol>} model
 * @returns {Iterable<AccountView<Protocol>>}
 */

export const list = ({ session }) => {
  const proof = DB.link()
  const account = DB.string()
  const results = DB.query(session.agent.db.index, {
    select: {
      id: account,
      proof,
    },
    where: [
      Account.match(proof, {
        audience: session.agent.did(),
        time: Date.now() / 1000,
        account,
      }),
    ],
  })

  const map = new Map()
  for (const { id } of results) {
    if (!map.has(id)) {
      const account = new AccountView({
        session,
        id: /** @type {API.DidMailto} */ (id),
      })
      map.set(id, account)
    }
  }

  return map.values()
}

/**
 * Gets the account view for the login with a given email address. Returns
 * `undefined` if no matching login is found.
 *
 * @template {API.UnknownProtocol} [Protocol=API.Service]
 * @param {Model<Protocol>} model
 * @param {API.EmailAddress} email
 */
export const get = ({ session }, email) => {
  const id = fromEmail(email)
  const proof = DB.link()
  const result = DB.query(session.agent.db.index, {
    select: {
      proof,
    },
    where: [
      Account.match(proof, {
        audience: session.agent.did(),
        time: Date.now() / 1000,
        account: id,
      }),
    ],
  })

  return result.length ? new AccountView({ session, id }) : undefined
}

/**
 * Removes all the delegations corresponding to the account logins for the given
 * email address.
 *
 * @template {API.UnknownProtocol} [Protocol=API.Service]
 * @param {Model<Protocol>} model
 * @param {API.EmailAddress} email
 */
export const remove = async ({ session }, email) => {
  const id = fromEmail(email)
  const proof = DB.link()
  // Find all the delegations that are logins for the account with this a given
  // email address.
  const matches = DB.query(session.agent.db.index, {
    select: {
      proof,
    },
    where: [
      Account.match(proof, {
        audience: session.agent.did(),
        time: Date.now() / 1000,
        account: id,
      }),
    ],
  })

  // Build a transaction that retracts all matching delegations.
  const transaction = []
  for (const { proof } of matches) {
    const record = session.agent.db.proofs.get(proof.toString())
    if (record) {
      transaction.push(DB.retract({ proof: record.delegation }))
    }
  }

  // Execute the transaction.
  const { error } = await DB.transact(session.agent.db, transaction)
  return error ? { error } : { ok: {} }
}

/**
 * @template {API.UnknownProtocol} [Protocol=API.Service]
 */
class AccountView {
  /**
   * @param {object} source
   * @param {API.Session<Protocol>} source.session
   * @param {API.DidMailto} source.id
   */
  constructor(source) {
    this.model = source
  }

  /**
   * @type {API.EmailAddress}
   */
  get email() {
    return toEmail(this.model.id)
  }
}

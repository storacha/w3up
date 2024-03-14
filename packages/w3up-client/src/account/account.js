import * as API from '../types.js'
import * as Query from './query.js'
import * as Access from '../access.js'
import * as DB from '../agent/db.js'
import * as DIDMailto from '@web3-storage/did-mailto'
import * as Plan from '../account/plan.js'
import * as Space from '../space.js'
import * as Task from '../task.js'

export { DIDMailto }

/**
 * @template {API.AccountProtocol} [Protocol=API.W3UpProtocol]
 * @param {object} source
 * @param {object} source.login
 * @param {API.DidMailto} source.login.id
 * @param {Map<string, API.Delegation>} source.login.proofs
 * @param {Map<string, API.Delegation>} source.login.attestations
 * @param {API.Session<Protocol>} source.session
 */
export const view = ({ login, session }) =>
  new AccountView({
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

/**
 * @template {API.AccountProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} session
 * @param {object} source
 * @param {API.EmailAddress} source.email
 * @param {AbortSignal} [source.signal]
 * @returns {Task.Invocation<AccountView<Protocol>, API.AccessDenied|API.InvocationError|API.AccessAuthorizeFailure>}
 */
export const login = (session, { email, signal }) =>
  Task.spawn(function* () {
    const account = get(session, email)
    if (account) {
      return account
    }
    const id = DIDMailto.fromEmail(email)
    const access = yield* Access.request(session, {
      account: id,
      can: Access.accountAccess,
    })

    const { proofs } = yield* access.claim({ signal })

    const login = { id, attestations: new Map(), proofs: new Map() }
    for (const proof of proofs) {
      if (proof.capabilities?.[0].can === 'ucan/attest') {
        login.attestations.set(`${proof.cid}`, proof)
      } else {
        login.proofs.set(`${proof.cid}`, proof)
      }
    }

    return view({ session, login })
  })

/**
 * @template {API.AccountProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} session
 * @returns {Record<API.AccountDID, AccountView<Protocol>>}
 */
export const list = (session) => {
  const matches = Query.select(
    session.agent.db,
    DB.query(
      session.agent.db.index,
      Query.query({ audience: session.agent.signer.did() })
    )
  )

  return Object.fromEntries(
    [...matches].map(([account, login]) => [account, view({ session, login })])
  )
}

/**
 * Gets the account view for the login with a given email address. Returns
 * `undefined` if no matching login is found.
 *
 * @template {API.AccountProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} session
 * @param {API.EmailAddress} email
 */
export const get = (session, email) => {
  const account = DIDMailto.fromEmail(email)
  const [login] = Query.select(
    session.agent.db,
    DB.query(
      session.agent.db.index,
      Query.query({ audience: session.agent.signer.did(), account })
    )
  ).values()

  return login ? view({ session, login }) : undefined
}

/**
 * Stores account into in the agent's database so it is retained between
 * sessions.
 *
 * ⚠️ If agent provided is not the agent authorized by the account stored
 * account will not be listed until session is created with an authorized agent.
 *
 * @param {API.Session} session
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
 * @param {API.Session} session
 * @param {API.AccountView} account
 */
export function* remove({ agent }, account) {
  yield* DB.transact(
    agent.db,
    [...account.proofs].map((proof) => DB.retract({ proof }))
  )

  return {}
}

/**
 * @template {API.AccountProtocol} [Protocol=API.W3UpProtocol]
 * @implements {API.AccountView}
 * @implements {API.AccountSession<Protocol>}
 */
class AccountView {
  /**
   * @param {object} source
   * @param {API.DidMailto} source.id
   * @param {API.Session<Protocol>} source.session
   */
  constructor(source) {
    this.model = source

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

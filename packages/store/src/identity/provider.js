import * as Capability from './capability.js'
import * as Server from '@ucanto/server'
import { delegate } from '@ucanto/client'
import * as API from '../type.js'
import { Authority } from '@ucanto/server'

/**
 * @typedef {{account:API.DID, proof:Server.LinkedProof}} AccountLink
 * @typedef {{
 *   set: (key:string, value:AccountLink) => API.Await<unknown>
 *   get: (key:string) => API.Await<AccountLink|undefined>
 * }} DB
 * @typedef {{
 *   send: (to:string, token:string) => API.Await<unknown>
 * }} Email
 * @typedef {{
 * id: API.SigningAuthority
 * db: DB
 * email: Email
 * }} Context
 *
 * @param {Context} context
 * @return {{identity: API.Identity.Identity}}
 */
export const create = ({ id, db, email }) => ({
  identity: {
    validate: Server.provide(Capability.Validate, async ({ capability }) => {
      const delegation = await delegate({
        issuer: id,
        audience: Authority.parse(capability.with),
        capabilities: [
          {
            can: 'identity/register',
            with: capability.caveats.as,
            as: capability.uri.href,
          },
        ],
      })

      await email.send(
        capability.caveats.as.slice('mailto:'.length),
        Server.UCAN.format(delegation.data)
      )

      return null
    }),
    register: Server.provide(
      Capability.Register,
      async ({ capability, invocation }) => {
        const result = await associate(
          db,
          capability.caveats.as,
          capability.uri.href,
          invocation.cid,
          true
        )
        if (result) {
          return null
        } else {
          throw new Error(`registering account should never fail`)
        }
      }
    ),
    link: Server.provide(
      Capability.Link,
      async ({ capability, invocation }) => {
        const id = /** @type {API.Identity.ID} */ (capability.uri.href)
        if (
          await associate(db, capability.caveats.as, id, invocation.cid, false)
        ) {
          return null
        } else {
          return new NotRegistered([invocation.issuer.did(), id])
        }
      }
    ),
    identify: Server.provide(Capability.Identify, async ({ capability }) => {
      const id = /** @type {API.Identity.ID} */ (capability.uri.href)
      const account = await resolve(db, id)
      return account || new NotRegistered([id])
    }),
  },
})

/**
 * @param {DB} db
 * @param {API.Identity.ID} from
 * @param {API.Identity.ID} to
 * @param {API.LinkedProof} proof
 * @param {boolean} create
 * @returns {Promise<boolean>}
 */
const associate = async (db, from, to, proof, create) => {
  const [fromAccount, toAccount] = await Promise.all([
    resolve(db, from),
    resolve(db, to),
  ])

  // So it could be that no did is linked with an account, one of the dids is
  // linked with an account or both dids are linked with accounts. If no did
  // is linked we just create a new account and link both did's with it. If
  // one of the dids is linked with the account we link other with the same
  // account if both are linked to a differnt accounts we create new joint
  // account and link all them together.
  if (!fromAccount && !toAccount) {
    if (create) {
      const account = /** @type {API.DID} */ (`did:ipld:${proof}`)
      await Promise.all([
        db.set(to, { account, proof }),
        db.set(from, { account, proof }),
      ])
    } else {
      return false
    }
  } else if (toAccount) {
    await db.set(from, { account: toAccount, proof })
  } else if (fromAccount) {
    await db.set(to, { account: fromAccount, proof })
  } else if (fromAccount !== toAccount) {
    const account = /** @type {API.DID} */ (`did:ipld:${proof}`)
    await Promise.all([
      db.set(toAccount, { account, proof }),
      db.set(fromAccount, { account, proof }),
    ])
  }

  return true
}

/**
 * Resolves memeber account. If member is not linked with any account returns
 * `null` otherwise returns DID of the account which will have a
 * `did:ipld:bafy...hash` form.
 *
 * @param {DB} db
 * @param {API.Identity.ID} member
 * @returns {Promise<API.DID|null>}
 */
const resolve = async (db, member) => {
  let group = await db.get(member)
  while (group) {
    const parent = await db.get(group.account)
    if (parent) {
      group = parent
    } else {
      return group.account
    }
  }
  return null
}

/**
 * @implements {API.Identity.NotRegistered}
 */
export class NotRegistered {
  /**
   * @param {[API.Identity.ID, ...API.Identity.ID[]]} ids
   */
  constructor(ids) {
    this.ids = ids
  }
  get message() {
    if (this.ids.length > 1) {
      return `No account is registered with such identifiers:\n - ${this.ids.join(
        '\n - '
      )}`
    } else {
      return `No account is registered for ${this.ids[0]}`
    }
  }
  get error() {
    return /** @type {true} */ (true)
  }
  /** @type {"NotRegistered"} */
  get name() {
    return 'NotRegistered'
  }
  toJSON() {
    const { name, message, ids, error } = this

    return { name, message, ids, error }
  }
}

// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import {
  delegationsToBytes,
  expirationToDate,
} from '@web3-storage/access/encoding'
import { Kysely } from 'kysely'
import { D1Dialect } from 'kysely-d1'
import { GenericPlugin } from '../utils/d1.js'

/**
 * @typedef {import('@web3-storage/access/src/types.js').DelegationRecord} DelegationRecord
 */

/**
 * Accounts
 */
export class Accounts {
  /**
   *
   * @param {D1Database} d1
   */
  constructor(d1) {
    /** @type {GenericPlugin<DelegationRecord>} */
    const objectPlugin = new GenericPlugin({
      // eslint-disable-next-line unicorn/no-null
      expiration: (v) => (typeof v === 'string' ? new Date(v) : null),
      inserted_at: (v) => new Date(v),
      updated_at: (v) => new Date(v),
    })
    this.d1 = /** @type {Kysely<import('../bindings').D1Schema>} */ (
      new Kysely({
        dialect: new D1Dialect({ database: d1 }),
        plugins: [objectPlugin],
      })
    )
  }

  /**
   * @param {Ucanto.URI<"did:">} did
   */
  async create(did) {
    const result = await this.d1
      .insertInto('accounts')
      .values({
        did,
      })
      .onConflict((oc) => oc.column('did').doNothing())
      .returning('accounts.did')
      .execute()
    return { data: result }
  }

  /**
   *
   * @param {Ucanto.Delegation} del
   */
  async addDelegation(del) {
    const result = await this.d1
      .insertInto('delegations')
      .values({
        cid: del.cid.toV1().toString(),
        audience: del.audience.did(),
        issuer: del.issuer.did(),
        bytes: delegationsToBytes([del]),
        expiration: expirationToDate(del.expiration),
      })
      .onConflict((oc) => oc.column('cid').doNothing())
      .returningAll()
      .executeTakeFirst()
    return result
  }

  /**
   * @param {Ucanto.URI<"did:">} did
   */
  async get(did) {
    return await this.d1
      .selectFrom('accounts')
      .selectAll()
      .where('accounts.did', '=', did)
      .executeTakeFirst()
  }

  /**
   * @param {Ucanto.URI<"did:">} did
   */
  async getDelegations(did) {
    return await this.d1
      .selectFrom('delegations')
      .selectAll()
      .where('delegations.audience', '=', did)
      .execute()
  }

  /**
   * @param {string} cid
   */
  async getDelegationsByCid(cid) {
    return await this.d1
      .selectFrom('delegations')
      .selectAll()
      .where('delegations.cid', '=', cid)
      .where((qb) =>
        qb
          .where('delegations.expiration', '>=', new Date())
          // eslint-disable-next-line unicorn/no-null
          .orWhere('delegations.expiration', 'is', null)
      )
      .executeTakeFirst()
  }
}

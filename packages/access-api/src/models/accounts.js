// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import { Kysely } from 'kysely'
import { D1Dialect } from 'kysely-d1'
import { GenericPlugin } from '../utils/d1.js'

/**
 * @typedef {import('kysely').Selectable<import('../types/access-api-cf-db.js').DelegationsV2Table>} DelegationV2Record
 */

/**
 * Accounts
 */
export class Accounts {
  /**
   * @param {D1Database} d1
   */
  constructor(d1) {
    /** @type {GenericPlugin<DelegationV2Record>} */
    const objectPlugin = new GenericPlugin({
      // eslint-disable-next-line unicorn/no-null
      expires_at: (v) => (typeof v === 'string' ? new Date(v) : null),
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
   * @param {Ucanto.URI<"did:">} did
   */
  async get(did) {
    return await this.d1
      .selectFrom('accounts')
      .selectAll()
      .where('accounts.did', '=', did)
      .executeTakeFirst()
  }
}

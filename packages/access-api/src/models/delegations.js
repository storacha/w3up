import * as Ucanto from '@ucanto/interface'
import {
  delegationsToBytes,
  bytesToDelegations,
} from '@web3-storage/access/encoding'

/**
 * @typedef {import('@web3-storage/access/src/types').DelegationTable} DelegationRow
 * @typedef {Omit<DelegationRow, 'inserted_at'|'updated_at'|'expires_at'>} DelegationRowUpdate
 */

/**
 * @typedef Tables
 * @property {DelegationRow} delegations
 */

/**
 * @typedef {import("../types/database").Database<Tables>} DelegationsDatabase
 */

/**
 * DelegationsStorage that persists using SQL.
 * * should work with cloudflare D1
 */
export class DbDelegationsStorage {
  /** @type {DelegationsDatabase} */
  #db

  /**
   * @param {DelegationsDatabase} db
   */
  constructor(db) {
    this.#db = db
    // eslint-disable-next-line no-void
    void (
      /** @type {import('../types/delegations').DelegationsStorage} */ (this)
    )
  }

  async count() {
    const { size } = await this.#db
      .selectFrom('delegations')
      .select((e) => e.fn.count('cid').as('size'))
      .executeTakeFirstOrThrow()
    return BigInt(size)
  }

  /**
   * @param {import('../types/delegations').Query} query
   */
  async *find(query) {
    for await (const row of await selectByAudience(this.#db, query.audience)) {
      yield rowToDelegation(row)
    }
  }

  /**
   * store items
   *
   * @param  {Array<Ucanto.Delegation>} delegations
   * @returns {Promise<void>}
   */
  async putMany(...delegations) {
    if (delegations.length === 0) {
      return
    }
    const values = delegations.map((d) => createDelegationRowUpdate(d))
    await this.#db
      .insertInto('delegations')
      .values(values)
      .onConflict((oc) => oc.column('cid').doNothing())
      .executeTakeFirst()
  }

  /**
   * iterate through all stored items
   *
   * @returns {AsyncIterableIterator<Ucanto.Delegation>}
   */
  async *[Symbol.asyncIterator]() {
    if (!this.#db.canStream) {
      throw Object.assign(
        new Error(
          `cannot create asyncIterator because the underlying database does not support streaming`
        ),
        { name: 'NotImplementedError' }
      )
    }
    for await (const row of this.#db
      .selectFrom('delegations')
      .select(['bytes'])
      .stream()) {
      yield rowToDelegation(row)
    }
  }
}

/**
 * @param {Pick<DelegationRow, 'bytes'>} row
 * @returns {Ucanto.Delegation}
 */
function rowToDelegation(row) {
  const delegations = bytesToDelegations(row.bytes)
  if (delegations.length !== 1) {
    throw new Error(
      `unexpected number of delegations from bytes: ${delegations.length}`
    )
  }
  return delegations[0]
}

/**
 * @param {Ucanto.Delegation} d
 * @returns {DelegationRowUpdate}
 */
function createDelegationRowUpdate(d) {
  return {
    cid: d.cid.toV1().toString(),
    audience: d.audience.did(),
    issuer: d.issuer.did(),
    bytes: delegationsToBytes([d]),
  }
}

/**
 * @param {DelegationsDatabase} db
 * @param {Ucanto.DID<'key'>} audience
 */
async function selectByAudience(db, audience) {
  return await db
    .selectFrom('delegations')
    .selectAll()
    .where('delegations.audience', '=', audience)
    .execute()
}

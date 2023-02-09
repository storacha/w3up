import * as Ucanto from '@ucanto/interface'
import { delegationsToBytes } from '@web3-storage/access/encoding'

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

  /** @type {import("../types/delegations").DelegationsStorage['length']} */
  get length() {
    throw new Error(`NotImplemented: D1DelegationsStorage#length`)
  }

  /**
   *
   * @param  {Array<Ucanto.Delegation>} delegations
   */
  push = async (...delegations) => {
    const values = delegations.map((d) => createDelegationRowUpdate(d))
    // @todo this might fail on foreign key constraint
    // as long as delegations table has col audience fk to accounts did
    // because audience might be a did:key not in accounts table
    await this.#db
      .insertInto('delegations')
      .values(values)
      .onConflict((oc) => oc.column('cid').doNothing())
      .returningAll()
      .executeTakeFirst()
  };

  // eslint-disable-next-line jsdoc/require-returns-check
  /**
   * @returns {IterableIterator<Ucanto.Delegation>}
   */
  [Symbol.iterator]() {
    throw new Error(`NotImplemented: D1DelegationsStorage#[Symbol.iterator]`)
  }
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

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

  /** @type {import("../types/delegations").DelegationsStorage['length']} */
  get length() {
    return new Promise((resolve, reject) => {
      this.#db
        .selectFrom('delegations')
        .select((e) => e.fn.count('cid').as('size'))
        .executeTakeFirstOrThrow()
        .then(({ size }) => {
          if (typeof size === 'string') {
            const sizeNumber = parseInt(size, 10)
            if (isNaN(sizeNumber)) {
              throw new TypeError(
                `unable to determine size number of delegations table`
              )
            }
            return sizeNumber
          }
          if (typeof size === 'bigint') {
            if (size > Number.MAX_SAFE_INTEGER) {
              throw new TypeError(`table size too big for js Number`)
            }
            return Number(size)
          }
          return size
        })
        .then(resolve)
        .catch(reject)
    })
  }

  /**
   *
   * @param  {Array<Ucanto.Delegation>} delegations
   */
  push = async (...delegations) => {
    const values = delegations.map((d) => createDelegationRowUpdate(d))
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

  /**
   * @returns {AsyncIterableIterator<Ucanto.Delegation>}
   */
  async *[Symbol.asyncIterator]() {
    if (this.#db.canStream) {
      for await (const row of this.#db
        .selectFrom('delegations')
        .select(['bytes'])
        .stream()) {
        yield rowToDelegation(row)
      }
    } else {
      // this db doesn't support .stream() so do something worse
      for (const row of await this.#db
        .selectFrom('delegations')
        .select(['bytes'])
        .execute()) {
        yield rowToDelegation(row)
      }
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

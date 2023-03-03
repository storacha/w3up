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
 * @property {DelegationRow} delegations_v2
 */

/**
 * @typedef {import("../types/database").Database<Tables>} DelegationsDatabase
 */

export const delegationsTable = /** @type {const} */ ('delegations_v2')

/**
 * DelegationsStorage that persists using SQL.
 * * should work with cloudflare D1
 */
export class DbDelegationsStorage {
  /** @type {DelegationsDatabase} */
  #db
  #tables = {
    delegations: delegationsTable,
  }

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
      .selectFrom(this.#tables.delegations)
      .select((e) => e.fn.count('cid').as('size'))
      .executeTakeFirstOrThrow()
    return BigInt(size)
  }

  /**
   * @param {import('../types/delegations').Query} query
   */
  async *find(query) {
    const { audience } = query
    const { delegations } = this.#tables
    const selection = await this.#db
      .selectFrom(delegations)
      .selectAll()
      .where(`${delegations}.audience`, '=', audience)
      .execute()
    for await (const row of selection) {
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
      .insertInto(this.#tables.delegations)
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
      .selectFrom(this.#tables.delegations)
      .select(['bytes'])
      .stream()) {
      yield rowToDelegation(row)
    }
  }
}

/**
 * indicates that processing failed due to encountering an unexpected delegation.
 * e.g. if a delegation could not be parsed from underlying storage
 */
class UnexpectedDelegation extends Error {
  name = 'UnexpectedDelegation'
}

/**
 * @param {Pick<DelegationRow, 'bytes'>} row
 * @returns {Ucanto.Delegation}
 */
function rowToDelegation(row) {
  /** @type {Ucanto.Delegation[]} */
  let delegations = []
  try {
    delegations = bytesToDelegations(row.bytes)
  } catch (error) {
    if (
      typeof error === 'object' &&
      error &&
      error.toString() === 'TypeError: Input should be a non-empty Uint8Array.'
    ) {
      throw Object.assign(
        new UnexpectedDelegation(`failed to create delegation from row`, {
          cause: error,
        }),
        // adding these so they appear in sentry et al and can aid debugging
        {
          row,
        }
      )
    }
    throw error
  }
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
export function createDelegationRowUpdate(d) {
  return {
    cid: d.cid.toV1().toString(),
    audience: d.audience.did(),
    issuer: d.issuer.did(),
    bytes: delegationsToBytes([d]),
  }
}

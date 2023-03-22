import * as Ucanto from '@ucanto/interface'
import {
  delegationsToBytes,
  bytesToDelegations,
} from '@web3-storage/access/encoding'

/**
 * @typedef {import('../types/access-api-cf-db').R2Bucket} R2Bucket
 */

/**
 * @template {import('../types/access-api-cf-db').DelegationsV2Table | import('../types/access-api-cf-db').DelegationsV3Table} DelegationRow
 * @typedef {Omit<DelegationRow, 'inserted_at'|'updated_at'|'expires_at'>} DelegationRowUpdate
 */

/**
 * @template Tables
 * @typedef {import("../types/database").Database<Tables>} Database
 */

export const delegationsV2TableName = /** @type {const} */ ('delegations_v2')

/**
 * DelegationsStorage that persists using SQL.
 * * should work with cloudflare D1 v2 schema
 *
 * @template {Database<AccessApiD1TablesV2>} DB
 */
export class DbDelegationsStorage {
  /** @type {DB} */
  #db
  #tables = {
    delegations: delegationsV2TableName,
  }

  /**
   * @param {DB} db
   */
  constructor(db) {
    this.#db = db
    // eslint-disable-next-line no-void
    void (
      /** @type {import('../types/delegations').DelegationsStorage} */ (this)
    )
  }

  async count() {
    return count(this.#db, this.#tables.delegations)
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
 * @param {Pick<import('../types/access-api-cf-db').DelegationsV2Table, 'bytes'>} row
 * @returns {Ucanto.Delegation}
 */
function rowToDelegation(row) {
  /** @type {Ucanto.Delegation[]} */
  let delegations = []
  try {
    delegations = bytesToDelegations(new Uint8Array(row.bytes))
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
 * @returns {DelegationRowUpdate<import('../types/access-api-cf-db').DelegationsV2Table>}
 */
export function createDelegationRowUpdate(d) {
  return {
    cid: d.cid.toV1().toString(),
    audience: d.audience.did(),
    issuer: d.issuer.did(),
    bytes: delegationsToBytes([d]),
  }
}

/**
 * @param {Ucanto.Delegation} d
 */
export function createDelegationRowUpdateV3(d) {
  return {
    cid: d.cid.toV1().toString(),
    audience: d.audience.did(),
    issuer: d.issuer.did(),
  }
}

/**
 * @param {Array<number> | Buffer | unknown} sqlValue - value from kysely 'bytes' table - in node it could be a Buffer. In cloudflare it might be an Array
 * @returns {ArrayBuffer|undefined} - undefined if unable to convert
 */
export function delegationsTableBytesToArrayBuffer(sqlValue) {
  if (ArrayBuffer.isView(sqlValue)) {
    return new Uint8Array(
      sqlValue.buffer,
      sqlValue.byteOffset,
      sqlValue.byteLength
    )
  }
  if (Array.isArray(sqlValue)) {
    return Uint8Array.from(sqlValue)
  }
}

/**
 * @typedef {`delegations_v3`} DelegationsTableWithoutBytesName
 */

/** @type {DelegationsTableWithoutBytesName} */
export const delegationsV3Table = `delegations_v3`

/**
 * @typedef {import('../types/access-api-cf-db').AccessApiD1TablesV2} AccessApiD1TablesV2
 * @typedef {import('../types/access-api-cf-db').AccessApiD1TablesV3} AccessApiD1TablesV3
 */

export class DbDelegationsStorageWithR2 {
  // @todo abstract away R2 specifics into DagStore: ~AsyncMap<CID, Ucanto.Delegation>
  /** @type {R2Bucket} */
  #dags
  /** @type {import('../types/database').Database<AccessApiD1TablesV3>} */
  #db
  /** @type {keyof AccessApiD1TablesV3} */
  #delegationsTableName = delegationsV3Table
  /* @type {(d: { cid: string }) => string} */
  #getDagsKey = delegationCarFileKeyer

  /**
   * @param {import('../types/database').Database<AccessApiD1TablesV3>} db
   * @param {R2Bucket} dags
   * @param {keyof AccessApiD1TablesV3} delegationsTableName
   */
  // eslint-disable-next-line no-useless-constructor
  constructor(db, dags, delegationsTableName = delegationsV3Table) {
    this.#db = db
    this.#delegationsTableName = delegationsTableName
    this.#dags = dags
    // eslint-disable-next-line no-void
    void (
      /** @type {import('../types/delegations').DelegationsStorage} */ (this)
    )
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
    await writeDelegations(this.#dags, delegations, this.#getDagsKey)
    const values = delegations.map((d) => createDelegationRowUpdateV3(d))
    await this.#db
      .insertInto(this.#delegationsTableName)
      .values(values)
      .onConflict((oc) => oc.column('cid').doNothing())
      .executeTakeFirst()
  }

  /** @returns {Promise<bigint>} */
  async count() {
    return count(this.#db, this.#delegationsTableName)
  }

  /**
   * @param {import('../types/delegations').Query} query
   */
  async *find(query) {
    const { audience } = query
    const delegations = this.#delegationsTableName
    const selection = await this.#db
      .selectFrom(delegations)
      .selectAll()
      .where(`${delegations}.audience`, '=', audience)
      .execute()
    for await (const row of selection) {
      yield this.#rowToDelegation(row)
    }
  }

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
      .selectFrom(this.#delegationsTableName)
      .select(['cid'])
      .stream()) {
      yield this.#rowToDelegation(row)
    }
  }

  /**
   * @param {Pick<import('../types/access-api-cf-db').DelegationsV3Table, 'cid'>} row
   * @param {R2Bucket} dags
   * @param {(d: { cid: string }) => string} keyer - builds k/v key strings for each delegation
   * @returns {Promise<Ucanto.Delegation>}
   */
  async #rowToDelegation(row, dags = this.#dags, keyer = this.#getDagsKey) {
    const cidString = row.cid.toString()
    const carBytesR2 = await dags.get(keyer({ cid: cidString }))
    if (!carBytesR2) {
      throw new Error(`failed to read car bytes for cid ${cidString}`)
    }
    const carBytes = new Uint8Array(await carBytesR2.arrayBuffer())
    const delegations = bytesToDelegations(carBytes)
    if (delegations.length !== 1) {
      throw new Error(
        `expected 1 delegation in CAR, but got ${delegations.length}`
      )
    }
    const [delegation] = delegations
    return delegation
  }
}

/**
 * @typedef {import('../types/access-api-cf-db').DelegationsV3Table} DelegationsV3Table
 * @typedef {import('../types/access-api-cf-db').DelegationsV2Table} DelegationsV2Table
 */

/**
 * @template {string} TableName
 * @template {Record<TableName, DelegationsV3Table|DelegationsV2Table>} Tables
 * @param {import('../types/database').Database<Tables>} db
 * @param {TableName} delegationsTable
 * @returns {Promise<bigint>} - count of table
 */
async function count(db, delegationsTable) {
  const { size } = await db
    .selectFrom(delegationsTable)
    .select((e) => e.fn.count('cid').as('size'))
    .executeTakeFirstOrThrow()
  return BigInt(size)
}

/**
 * @param {{ cid: string }} ucan
 */
function delegationCarFileKeyer(ucan) {
  return `${ucan.cid.toString()}.car`
}

/**
 * @param {R2Bucket} bucket
 * @param {Iterable<Ucanto.Delegation>} delegations
 * @param {(d: { cid: string }) => string} keyer - builds k/v key strings for each delegation
 */
async function writeDelegations(bucket, delegations, keyer) {
  return writeEntries(
    bucket,
    [...delegations].map((delegation) => {
      const key = keyer({ cid: delegation.cid.toString() })
      const carBytes = delegationsToBytes([delegation])
      const value = carBytes
      return /** @type {[key: string, value: Uint8Array]} */ ([key, value])
    })
  )
}

/**
 * @param {R2Bucket} bucket
 * @param {Iterable<readonly [key: string, value: Uint8Array ]>} entries
 */
async function writeEntries(bucket, entries) {
  await Promise.all(
    [...entries].map(async ([key, value]) => {
      return bucket.put(key, value)
    })
  )
}

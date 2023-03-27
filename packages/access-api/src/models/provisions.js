/* eslint-disable no-void */
import { Failure } from '@ucanto/server'

/**
 * @template {import("@ucanto/interface").DID} ServiceId
 * @typedef {import("../types/provisions").ProvisionsStorage<ServiceId>} Provisions
 */

/**
 * @template {import("@ucanto/interface").DID} ServiceId
 * @param {ServiceId[]} services
 * @param {Array<import("../types/provisions").Provision<ServiceId>>} storage
 * @returns {Provisions<ServiceId>}
 */
export function createProvisions(services, storage = []) {
  /** @type {Provisions<ServiceId>['hasStorageProvider']} */
  const hasStorageProvider = async (consumerId) => {
    const hasRowWithSpace = storage.some(({ space }) => space === consumerId)
    return hasRowWithSpace
  }
  /** @type {Provisions<ServiceId>['put']} */
  const put = async (item) => {
    storage.push(item)
    return {}
  }
  /** @type {Provisions<ServiceId>['count']} */
  const count = async () => {
    return BigInt(storage.length)
  }
  return {
    services,
    count,
    put,
    hasStorageProvider,
  }
}

/**
 * @typedef ProvisionsRow
 * @property {string} cid
 * @property {string} consumer
 * @property {string} provider
 * @property {string} sponsor - did of actor who authorized for this provision
 */

/**
 * @typedef {import("../types/database").Database<{ provisions: ProvisionsRow }>} ProvisionsDatabase
 */

/**
 * @template {import("@ucanto/interface").DID} ServiceId
 * Provisions backed by a kyseli database (e.g. sqlite or cloudflare d1)
 */
export class DbProvisions {
  /** @type {ProvisionsDatabase} */
  #db

  /**
   * @param {ServiceId[]} services
   * @param {ProvisionsDatabase} db
   */
  constructor(services, db) {
    this.services = services
    this.#db = db
    this.tableNames = {
      provisions: /** @type {const} */ ('provisions'),
    }
    void (/** @type {Provisions<ServiceId>} */ (this))
  }

  /** @type {Provisions<ServiceId>['count']} */
  async count(...items) {
    const { size } = await this.#db
      .selectFrom(this.tableNames.provisions)
      .select((e) => e.fn.count('provider').as('size'))
      .executeTakeFirstOrThrow()
    return BigInt(size)
  }

  /**
   * Selects all rows that match the query.
   *
   * @param {object} query
   * @param {string} [query.space]
   * @param {string} [query.provider]
   * @param {string} [query.sponsor]
   */
  async find(query = {}) {
    const { provisions } = this.tableNames
    let select = this.#db
      .selectFrom(provisions)
      .select(['cid', 'consumer', 'provider', 'sponsor'])

    if (query.space) {
      select = select.where(`${provisions}.consumer`, '=', query.space)
    }

    if (query.provider) {
      select = select.where(`${provisions}.provider`, '=', query.provider)
    }

    if (query.sponsor) {
      select = select.where(`${provisions}.sponsor`, '=', query.sponsor)
    }

    return await select.execute()
  }

  /** @type {Provisions<ServiceId>['put']} */
  async put(item) {
    /** @type {ProvisionsRow} */
    const row = {
      cid: item.invocation.cid.toString(),
      consumer: item.space,
      provider: item.provider,
      sponsor: item.account,
    }

    // We want to ensure that a space can not have provider of multiple types,
    // e.g. a space can not have both a web3.storage and nft.storage providers
    // otherwise it would be unclear where stored data should be added.
    // Therefore we check look for any existing rows for this space, and if
    // there is a row with a different provider, we error.
    // Note that this does not give us transactional guarantees and in the face
    // of concurrent requests, we may still end up with multiple providers
    // however we soon intend to replace this table with one that has necessary
    // constraints so we take this risk for now to avoid extra migration.
    const matches = await this.find({ space: row.consumer })
    const conflict = matches.find((row) => row.provider !== item.provider)
    if (conflict) {
      return new ConflictError({
        message: `Space ${row.consumer} can not be provisioned with ${row.provider}, it already has a ${conflict.provider} provider`,
        insertion: row,
        existing: conflict,
      })
    }

    /** @type {Array<keyof ProvisionsRow>} */
    const rowColumns = ['cid', 'consumer', 'provider', 'sponsor']
    const insert = this.#db
      .insertInto(this.tableNames.provisions)
      .values(row)
      .returning(rowColumns)

    let primaryKeyError
    try {
      await insert.executeTakeFirstOrThrow()
    } catch (error) {
      primaryKeyError = getCidUniquenessError(error)
      if (!primaryKeyError) {
        return new Failure(`Unexpected error inserting provision: ${error}`)
      }
    }

    if (!primaryKeyError) {
      // no error inserting, we're done with put
      return {}
    }

    // there was already a row with this invocation cid
    // as long as the row we tried to insert is same as one already there, no need to error.
    // so let's compare the existing row with that cid to the row we tried to insert.
    const existing = await this.#db
      .selectFrom(this.tableNames.provisions)
      .select(rowColumns)
      .where('cid', '=', row.cid)
      .executeTakeFirst()

    if (!existing) {
      return new Failure(`Unexpected error inserting provision`)
    }

    if (existing && deepEqual(existing, row)) {
      // the insert failed, but the existing row is identical to the row that failed to insert.
      // so the put is a no-op, and we can consider it a success despite encountering the primaryKeyError
      return {}
    }

    // this is a sign of something very wrong. throw so error reporters can report on it
    // and determine what led to a put() with same invocation cid but new non-cid column values
    return new ConflictError({
      message: `Provision with cid ${item.invocation.cid} already exists with different field values`,
      insertion: row,
      existing,
    })
  }

  /** @type {Provisions<ServiceId>['hasStorageProvider']} */
  async hasStorageProvider(consumerDid) {
    const { provisions } = this.tableNames
    const { size } = await this.#db
      .selectFrom(provisions)
      .select((e) => e.fn.count('provider').as('size'))
      .where(`${provisions}.consumer`, '=', consumerDid)
      .executeTakeFirstOrThrow()
    return size > 0
  }

  /**
   * @param {import("@ucanto/interface").DID<'key'>} consumer
   */
  async findForConsumer(consumer) {
    const { provisions } = this.tableNames
    const rows = await this.#db
      .selectFrom(provisions)
      .selectAll()
      .where(`${provisions}.consumer`, '=', consumer.toString())
      .execute()
    return rows
  }
}

/**
 * @param {Record<string,any>} x
 * @param {Record<string,any>} y
 * @returns {boolean}
 */
function deepEqual(x, y) {
  const ok = Object.keys
  const tx = typeof x
  const ty = typeof y
  return x && y && tx === 'object' && tx === ty
    ? ok(x).length === ok(y).length &&
        ok(x).every((key) => deepEqual(x[key], y[key]))
    : x === y
}

/**
 * @param {unknown} error
 */
function extractD1Error(error) {
  const isD1 = /D1_(ALL_)?ERROR/.test(String(error))
  if (!isD1) return
  const cause =
    error && typeof error === 'object' && 'cause' in error && error.cause
  const code =
    (cause &&
      typeof cause === 'object' &&
      'code' in cause &&
      typeof cause.code === 'string' &&
      cause.code) ||
    undefined
  return { cause, code }
}

class ConflictError extends Failure {
  /**
   * @param {object} input
   * @param {string} input.message
   * @param {unknown} input.insertion
   * @param {unknown} input.existing
   */
  constructor({ message, insertion, existing }) {
    super(message)
    this.name = 'ConflictError'
    this.insertion = insertion
    this.existing = existing
  }
}

/**
 * return whether or not the provided parameter indicates an error
 * writing provision to kysely database because there is already an entry
 * for the written a cid
 *
 * @param {unknown} error
 */
function getCidUniquenessError(error) {
  const d1Error = extractD1Error(error)
  if (d1Error?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
    return d1Error
  } else if (
    /UNIQUE constraint failed: provisions.cid/.test(String(d1Error?.cause))
  ) {
    return d1Error
  }
}

/* eslint-disable no-void */

/**
 * @template {import("@ucanto/interface").DID} ServiceId
 * @typedef {import("../types/provisions").ProvisionStore<ServiceId>} Provisions
 */

/**
 * @template {import("@ucanto/interface").DID} ServiceId
 * @param {ServiceId} service
 * @param {Array<import("../types/provisions").Provision<ServiceId>>} storage
 * @returns {Provisions<ServiceId>}
 */
export function createProvisions(service, storage = []) {
  /** @type {Provisions<ServiceId>['hasStorageProvider']} */
  const hasStorageProvider = async (consumerId) => {
    const hasRowWithSpace = storage.some(({ space }) => space === consumerId)
    return hasRowWithSpace
  }
  /** @type {Provisions<ServiceId>['put']} */
  const put = async (item) => {
    storage.push(item)
  }
  /** @type {Provisions<ServiceId>['count']} */
  const count = async () => {
    return BigInt(storage.length)
  }
  return {
    service,
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
   * @param {ServiceId} service
   * @param {ProvisionsDatabase} db
   */
  constructor(service, db) {
    this.service = service
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

  /** @type {Provisions<ServiceId>['put']} */
  async put(item) {
    /** @type {ProvisionsRow} */
    const row = {
      cid: item.invocation.cid.toString(),
      consumer: item.space,
      provider: item.provider,
      sponsor: item.account,
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
      const d1Error = extractD1Error(error)
      switch (d1Error?.code) {
        case 'SQLITE_CONSTRAINT_PRIMARYKEY': {
          primaryKeyError = error
          break
        }
        default: {
          throw error
        }
      }
    }

    if (!primaryKeyError) {
      // no error inserting, we're done with put
      return
    }

    // there was already a row with this invocation cid
    // as long as the row we tried to insert is same as one already there, no need to error.
    // so let's compare the existing row with that cid to the row we tried to insert.
    const existing = await this.#db
      .selectFrom(this.tableNames.provisions)
      .select(rowColumns)
      .where('cid', '=', row.cid)
      .executeTakeFirstOrThrow()
    if (deepEqual(existing, row)) {
      // the insert failed, but the existing row is identical to the row that failed to insert.
      // so the put is a no-op, and we can consider it a success despite encountering the primaryKeyError
      return
    }

    // this is a sign of something very wrong. throw so error reporters can report on it
    // and determine what led to a put() with same invocation cid but new non-cid column values
    throw Object.assign(
      new Error(
        `Provision with cid ${item.invocation.cid} already exists with different field values`
      ),
      {
        insertion: row,
        existing,
      }
    )
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
  const isD1 = /D1_ALL_ERROR/.test(String(error))
  if (!isD1) return
  const cause =
    error && typeof error === 'object' && 'cause' in error && error.cause
  const code =
    cause &&
    typeof cause === 'object' &&
    'code' in cause &&
    typeof cause.code === 'string' &&
    cause.code
  return { cause, code }
}

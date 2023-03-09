/* eslint-disable no-void */

/**
 * @typedef {import("../types/provisions").ProvisionsStorage} Provisions
 */

/**
 * @param {Array<import("../types/provisions").Provision>} storage
 * @returns {Provisions}
 */
export function createProvisions(storage = []) {
  /** @type {Provisions['hasStorageProvider']} */
  const hasStorageProvider = async (consumerId) => {
    const hasRowWithSpace = storage.some(({ space }) => space === consumerId)
    return hasRowWithSpace
  }
  /** @type {Provisions['putMany']} */
  const putMany = async (...items) => {
    storage.push(...items)
  }
  /** @type {Provisions['count']} */
  const count = async () => {
    return BigInt(storage.length)
  }
  return {
    count,
    putMany,
    hasStorageProvider,
  }
}

/**
 * @typedef ProvsionsRow
 * @property {string} cid
 * @property {string} consumer
 * @property {string} provider
 * @property {string} sponsor - did of actor who authorized for this provision
 */

/**
 * @typedef {import("../types/database").Database<{ provisions: ProvsionsRow }>} ProvisionsDatabase
 */

/**
 * Provisions backed by a kyseli database (e.g. sqlite or cloudflare d1)
 */
export class DbProvisions {
  /** @type {ProvisionsDatabase} */
  #db

  /**
   * @param {ProvisionsDatabase} db
   */
  constructor(db) {
    this.#db = db
    this.tableNames = {
      provisions: /** @type {const} */ ('provisions'),
    }
    void (/** @type {Provisions} */ (this))
  }

  /** @type {Provisions['count']} */
  async count(...items) {
    const { size } = await this.#db
      .selectFrom(this.tableNames.provisions)
      .select((e) => e.fn.count('provider').as('size'))
      .executeTakeFirstOrThrow()
    return BigInt(size)
  }

  /** @type {Provisions['putMany']} */
  async putMany(...items) {
    if (items.length === 0) {
      return
    }
    /** @type {ProvsionsRow[]} */
    const rows = items.map((item) => {
      return {
        cid: item.invocation.cid.toString(),
        consumer: item.space,
        provider: item.provider,
        sponsor: item.account,
      }
    })
    await this.#db
      .insertInto(this.tableNames.provisions)
      .values(rows)
      .onConflict((oc) => {
        // if cid conflicts, update columns w/ values from conflicting insert
        return oc.column('cid').doUpdateSet({
          consumer: (eb) => eb.ref('excluded.consumer'),
          provider: (eb) => eb.ref('excluded.provider'),
          sponsor: (eb) => eb.ref('excluded.sponsor'),
        })
      })
      .executeTakeFirstOrThrow()
  }

  /** @type {Provisions['hasStorageProvider']} */
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

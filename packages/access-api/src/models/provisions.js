/* eslint-disable no-void */

/**
 * @typedef {import("../types/provisions").Provisions} Provisions
 */

/**
 * @param {Array<import("../types/provisions").StorageProvisionCreation>} storage
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
        consumer: item.space,
        provider: item.provider,
        sponsor: item.account,
      }
    })
    await this.#db
      .insertInto(this.tableNames.provisions)
      .values(rows)
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
}

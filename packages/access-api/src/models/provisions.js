/* eslint-disable no-void */

/**
 * @typedef {import("../types/provisions").StorageProvisions} StorageProvisions
 */

/**
 * @param {Array<import("../types/provisions").StorageProvisionCreation>} storage
 * @returns {StorageProvisions}
 */
export function createStorageProvisions(storage = []) {
  /** @type {StorageProvisions['hasStorageProvider']} */
  const hasStorageProvider = async (consumerId) => {
    const hasRowWithSpace = storage.some(({ space }) => space === consumerId)
    return hasRowWithSpace
  }
  /** @type {StorageProvisions['putMany']} */
  const putMany = async (...items) => {
    storage.push(...items)
  }
  /** @type {StorageProvisions['count']} */
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
 * @property {string} issuer - did of actor who did the provisioning
 */

/**
 * @typedef {import("../types/database").Database<{ provisions: ProvsionsRow }>} ProvisionsDatabase
 */

/**
 * StorageProvisions backed by a kyseli database (e.g. sqlite or cloudflare d1)
 */
export class DbStorageProvisions {
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
    void (/** @type {StorageProvisions} */ (this))
  }

  /** @type {StorageProvisions['count']} */
  async count(...items) {
    const { size } = await this.#db
      .selectFrom(this.tableNames.provisions)
      .select((e) => e.fn.count('provider').as('size'))
      .executeTakeFirstOrThrow()
    return BigInt(size)
  }

  /** @type {StorageProvisions['putMany']} */
  async putMany(...items) {
    if (items.length === 0) {
      return
    }
    /** @type {ProvsionsRow[]} */
    const rows = items.map((item) => {
      return {
        consumer: item.space,
        provider: item.provider,
        issuer: item.account,
      }
    })
    await this.#db
      .insertInto(this.tableNames.provisions)
      .values(rows)
      .executeTakeFirstOrThrow()
  }

  /** @type {StorageProvisions['hasStorageProvider']} */
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

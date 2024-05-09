/** @typedef {import('../../src/types/usage.js').UsageStorage} UsageStore */

/** @implements {UsageStore} */
export class UsageStorage {
  /**
   * @param {import('./store-table.js').StoreTable} storeTable
   * @param {import('./allocations-storage.js').AllocationsStorage} allocationsStorage
   */
  constructor(storeTable, allocationsStorage) {
    this.storeTable = storeTable
    this.allocationsStorage = allocationsStorage
  }

  get items() {
    return [
      ...this.storeTable.items.map((item) => ({
        ...item,
        cause: item.invocation,
      })),
      ...this.allocationsStorage.items.map((item) => ({
        ...item,
        size: item.blob.size,
      })),
    ]
  }

  /**
   * @param {import('../types.js').ProviderDID} provider
   * @param {import('../types.js').SpaceDID} space
   * @param {{ from: Date, to: Date }} period
   */
  async report(provider, space, period) {
    const before = this.items.filter((item) => {
      const insertTime = new Date(item.insertedAt).getTime()
      return item.space === space && insertTime < period.from.getTime()
    })
    const during = this.items.filter((item) => {
      const insertTime = new Date(item.insertedAt).getTime()
      return (
        item.space === space &&
        insertTime >= period.from.getTime() &&
        insertTime < period.to.getTime()
      )
    })
    const initial = before.reduce((total, item) => (total += item.size), 0)
    const final = during.reduce((total, item) => (total += item.size), 0)

    return {
      ok: {
        provider,
        space,
        period: {
          from: period.from.toISOString(),
          to: period.to.toISOString(),
        },
        size: { initial, final },
        events: during.map((item) => {
          return {
            cause: /** @type {import('../types.js').Link} */ (item.cause),
            delta: item.size,
            receiptAt: item.insertedAt,
          }
        }),
      },
    }
  }
}

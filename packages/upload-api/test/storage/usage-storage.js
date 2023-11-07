/** @typedef {import('../../src/types/usage.js').UsageStorage} UsageStore */

/** @implements {UsageStore} */
export class UsageStorage {
  /** @param {import('./store-table.js').StoreTable} storeTable */
  constructor (storeTable) {
    this.storeTable = storeTable
  }

  /**
   * @param {import('../types.js').ProviderDID} provider
   * @param {import('../types.js').SpaceDID} space
   * @param {{ from: Date, to: Date }} period
   */
  async report (provider, space, period) {
    const before = this.storeTable.items.filter(item => {
      const insertTime = new Date(item.insertedAt).getTime()
      return item.space === space && insertTime < period.from.getTime()
    })
    const during = this.storeTable.items.filter(item => {
      const insertTime = new Date(item.insertedAt).getTime()
      return item.space === space
        && insertTime >= period.from.getTime()
        && insertTime < period.to.getTime()
    })
    const initial = before.reduce((total, item) => total += item.size, 0)
    const final = during.reduce((total, item) => total += item.size, 0)

    return {
      ok: {
        provider,
        space,
        period: {
          from: period.from.toISOString(),
          to: period.to.toISOString()
        },
        size: { initial, final },
        events: during.map(item => {
          return {
            cause: item.invocation.link(),
            delta: item.size,
            receiptAt: item.insertedAt
          }
        })
      }
    }
  }
}

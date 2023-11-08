/**
 * @typedef {import('../../src/types/subscriptions.js').SubscriptionsStorage} SubscriptionsStore
 */

/**
 * @implements {SubscriptionsStore}
 */
export class SubscriptionsStorage {
  /** @param {import('./provisions-storage.js').ProvisionsStorage} provisions */
  constructor (provisions) {
    this.provisionsStore = provisions
  }

  /** @param {import('../types.js').AccountDID} account */
  async list(account) {
    /** @type {import('../types.js').SubscriptionListItem[]} */
    const results = []
    const entries = Object.entries(this.provisionsStore.provisions)
    for (const [subscription, { customer, provider, consumer }] of entries) {
      if (customer !== account) continue
      results.push({
        subscription,
        provider,
        consumers: [consumer]
      })
    }
    return { ok: { results } }
  }
}

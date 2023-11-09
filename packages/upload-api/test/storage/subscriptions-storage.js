/**
 * @typedef {import('../../src/types/subscriptions.js').SubscriptionsStorage} SubscriptionsStore
 */

/**
 * @implements {SubscriptionsStore}
 */
export class SubscriptionsStorage {
  /** @param {import('./provisions-storage.js').ProvisionsStorage} provisions */
  constructor(provisions) {
    this.provisionsStore = provisions
  }

  /** @param {import('../types.js').AccountDID} customer */
  async list(customer) {
    /** @type {import('../types.js').SubscriptionListItem[]} */
    const results = []
    const entries = Object.entries(this.provisionsStore.provisions)
    for (const [subscription, provision] of entries) {
      if (provision.customer !== customer) continue
      results.push({
        subscription,
        provider: provision.provider,
        consumers: [provision.consumer],
      })
    }
    return { ok: { results } }
  }
}

import * as Types from '../src/types.js'

/**
 * 
 * @param {Types.Provision} item 
 * @returns {string}
 */
const itemKey = (item) => `${item.customer}@${item.provider}`

/**
 * @implements {Types.ProvisionsStorage}
 */
export class ProvisionsStorage {
  /**
   *
   * @param {Array<Types.ServiceDID | string>} providers
   */
  constructor(providers = ['did:web:test.web3.storage']) {
    /**
     * @type {Record<string, Types.Provision>}
     */
    this.provisions = {}
    this.providers = /** @type {Types.ServiceDID[]} */ (providers)
  }

  /**
   * @returns {Types.ServiceDID[]}
   */
  get services() {
    return this.providers
  }

  /**
   *
   * @param {Types.DIDKey} consumer
   */
  async hasStorageProvider(consumer) {
    return { ok: !!Object.values(this.provisions).find(i => i.consumer === consumer) }
  }

  /**
   *
   * @param {Types.Provision} item
   * @returns
   */
  async put(item) {
    const storedItem = this.provisions[itemKey(item)]
    if (
      storedItem &&
      (
        (storedItem.provider !== item.provider) || 
        (storedItem.customer !== item.customer) || 
        (storedItem.consumer !== item.consumer) || 
        (storedItem.cause.link() !== item.cause.link())
      )
    ) {
      return { error: new Error(`could not store ${JSON.stringify(item)}`) }
    } else {
      this.provisions[itemKey(item)] = item
      return { ok: {} }
    }
  }

  /**
   * 
   * @param {Types.ProviderDID} provider 
   * @param {Types.DID<'mailto'>} customer 
   * @returns 
   */
  async getCustomer(provider, customer) {
    const exists = Object.values(this.provisions).find(p => (p.provider === provider) && (p.customer === customer))
    return { ok: exists ? { did: customer } : null }
  }

  async count() {
    return BigInt(Object.values(this.provisions).length)
  }
}

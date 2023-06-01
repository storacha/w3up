import * as Types from '../src/types.js'

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
     * @type {Record<Types.DIDKey, Types.Provision>}
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
    return { ok: !!this.provisions[consumer] }
  }

  /**
   *
   * @param {Types.Provision} item
   * @returns
   */
  async put(item) {
    if (
      this.provisions[item.consumer] &&
      this.provisions[item.consumer].provider !== item.provider
    ) {
      return { error: new Error() }
    } else {
      this.provisions[item.consumer] = item
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

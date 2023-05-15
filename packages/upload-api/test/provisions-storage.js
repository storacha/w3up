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
     * @type {Record<Types.DIDKey, Types.Provision<Types.ServiceDID>>} 
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
   * @param {Types.Provision<Types.ServiceDID>} item 
   * @returns 
   */
  async put(item) {
    if (this.provisions[item.space] && (this.provisions[item.space].provider !== item.provider)) {
      return { error: new Error() }
    } else {
      this.provisions[item.space] = item
      return { ok: {} }
    }
  }

  async count() {
    return BigInt(0)
  }
}

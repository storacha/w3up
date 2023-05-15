import * as Types from '../src/types.js'

/**
 * @implements {Types.ProvisionsStorage}
 */
export class ProvisionsStorage {

  constructor(){
    /**
     * @type {Record<Types.DIDKey, Types.Provision<Types.ServiceDID>>} 
     */
    this.providers = {}
  }

  /**
   * @returns {Types.ServiceDID[]}
   */
  get services(){
    return ['did:web:test.web3.storage']
  }

  /**
   * 
   * @param {Types.DIDKey} consumer 
   */
  async hasStorageProvider(consumer) {
    return { ok: !!this.providers[consumer] }
  }

  /**
   * 
   * @param {Types.Provision<Types.ServiceDID>} item 
   * @returns 
   */
  async put(item) {
    this.providers[item.space] = item
    return { ok: {} }
  }

  async count() {
    return BigInt(0)
  }
}

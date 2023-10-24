import * as Types from '../../src/types.js'

/**
 * @implements {Types.PlansStorage}
 */
export class PlansStorage {
  constructor() {
    /**
     * @type {Record<Types.DID, {product: Types.DID, updatedAt: string}>}
     */
    this.plans = {}
  }

  /**
   *
   * @param {Types.DID} account
   * @returns
   */
  async get(account) {
    return { ok: this.plans[account] }
  }

  /**
   *
   * @param {Types.DID} account
   * @param {Types.DID} product
   * @returns
   */
  async set(account, product) {
    this.plans[account] = {
      product,
      updatedAt: new Date().toISOString(),
    }
    return { ok: {} }
  }
}

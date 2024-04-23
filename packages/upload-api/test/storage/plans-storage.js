import { CustomerNotFound, CustomerExists } from '../../src/plan.js'
import * as Types from '../../src/types.js'

/**
 * @implements {Types.PlansStorage}
 */
export class PlansStorage {
  constructor() {
    /**
     * @type {Record<Types.DID, {product: Types.DID, billingID: string, updatedAt: string}>}
     */
    this.plans = {}
  }

  /**
   *
   * @param {Types.AccountDID} account
   * @param {string} billingID
   * @param {Types.DID} product
   */
  async initialize(account, billingID, product) {
    if (this.plans[account]) {
      return { error: new CustomerExists(account) }
    }
    this.plans[account] = {
      product,
      billingID,
      updatedAt: new Date().toISOString(),
    }
    return { ok: {} }
  }

  /**
   *
   * @param {Types.AccountDID} account
   * @returns
   */
  async get(account) {
    const plan = this.plans[account]
    if (plan) {
      return { ok: this.plans[account] }
    } else {
      return {
        error: {
          name: /** @type {const} */ ('PlanNotFound'),
          message: `could not find a plan for ${account}`,
        },
      }
    }
  }

  /**
   *
   * @param {Types.AccountDID} account
   * @param {Types.DID} product
   * @returns
   */
  async set(account, product) {
    if (!this.plans[account]) {
      return { error: new CustomerNotFound(account) }
    }
    this.plans[account].product = product
    this.plans[account].updatedAt = new Date().toISOString()
    return { ok: {} }
  }

  /**
   * @param {Types.AccountDID} account
   * @returns {Promise<import('@ucanto/interface').Result<import('../types.js').PlanCreateAdminSessionSuccess, import('../types.js').PlanCreateAdminSessionFailure>>}
   */
  async createAdminSession(account) {
    return { ok: { url: 'https://example.com/admin-session' } }
  }
}

import * as API from './types.js'
import * as Space from './space.js'
import * as Account from './account.js'
import * as Coupon from './coupon.js'

/**
 * @template {API.UnknownProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} model
 * @returns {API.W3UpSession}
 */
export const create = (model) =>
  new Session(/** @type {API.Session<any>} */ (model))

/**
 * @template {API.UnknownProtocol} [Protocol=API.W3UpProtocol]
 * @implements {API.Session<Protocol>}
 */
class Session {
  /**
   * @param {API.Session<Protocol>} model
   */
  constructor(model) {
    this.model = model
    this.spaces = Space.view(/** @type {API.Session<any>} */ (this.model))
    this.accounts = Account.view(/** @type {API.Session<any>} */ (this.model))
    this.coupons = Coupon.view(/** @type {API.Session<any>} */ (this.model))
  }
  get connection() {
    return this.model.connection
  }
  get agent() {
    return this.model.agent
  }
}

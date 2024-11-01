import * as API from '../types.js'
import * as Provider from '@ucanto/server'
import { Customer } from '@storacha/capabilities'

/**
 * @param {API.CustomerServiceContext} context
 */
export const provide = (context) =>
  Provider.provide(Customer.get, (input) => get(input, context))

/**
 * @param {API.Input<Customer.get>} input
 * @param {API.CustomerServiceContext} context
 * @returns {Promise<API.CustomerGetResult>}
 */
const get = async ({ capability }, context) => {
  /**
   * Ensure that resource is the service DID, which implies it's either
   * invoked by service itself or an authorized delegate (like admin).
   * In other words no user will be able to invoke this unless service
   * explicitly delegated capability to them to do so.
   */
  if (capability.with !== context.signer.did()) {
    return { error: new UnknownProvider(capability.with) }
  }

  return await context.provisionsStorage.getCustomer(
    capability.with,
    capability.nb.customer
  )
}

class UnknownProvider extends Provider.Failure {
  /**
   * @param {API.DID} did
   */
  constructor(did) {
    super()
    this.did = did
    this.name = /** @type {const} */ ('UnknownProvider')
  }

  /**
   *
   */
  describe() {
    return `Provider ${this.did} not found`
  }
}

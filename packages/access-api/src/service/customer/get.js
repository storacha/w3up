import * as API from '../../api.js'
import * as Provider from '@ucanto/server'
import { Customer } from '@web3-storage/capabilities'

/**
 * @param {API.RouteContext} context
 */
export const provide = (context) =>
  Provider.provide(Customer.get, (input) => get(input, context))

/**
 * @param {API.Input<Customer.get>} input
 * @param {API.RouteContext} context
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

  const customer = await context.models.accounts.get(capability.nb.customer)
  return { ok: { customer: customer || null } }
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

  describe() {
    return `Provider ${this.did} not found`
  }
}

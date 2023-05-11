import * as Types from '../types.js'
import * as Provider from '@ucanto/server'
import { Customer } from '@web3-storage/capabilities'

/**
 * @param {Types.CustomerServiceContext} context
 */
export const provide = (context) =>
  Provider.provide(Customer.get, (input) => get(input, context))

/**
 * @param {Types.Input<Customer.get>} input
 * @param {Types.CustomerServiceContext} context
 * @returns {Promise<Types.CustomerGetResult>}
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

  // TODO: we used to query the accounts table for this, but that only
  // returns the DID we already have. we may want to query other tables in the future
  // but for now I think we can skip this and drop the accounts table entirely
  // const customer = await context.models.accounts.get(capability.nb.customer)
  const customer = {did: capability.nb.customer}
  return { ok: { customer: customer || null } }
}

class UnknownProvider extends Provider.Failure {
  /**
   * @param {Types.DID} did
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

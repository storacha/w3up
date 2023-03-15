/* eslint-disable unicorn/new-for-builtins, max-depth */
import * as Server from '@ucanto/server'
import { Verifier } from '@ucanto/principal'
import { Customer, Consumer } from '@web3-storage/capabilities'
import * as Capabilities from '@web3-storage/capabilities/types'
import { bytesToDelegations } from '@web3-storage/access/encoding'
import { claim, Failure } from '@ucanto/validator'

/**
 * @typedef {object} Context
 * @property {object} models
 * @property {import('../types/subscriptions').SubscriptionStore} models.subscriptions
 * @property {import('../types/delegations').DelegationsStorage} models.delegations
 * @property {Server.Signer<Server.API.DID<'web'>>} signer
 * @property {URL} url
 * @property {import('../bindings').Email} email
 */

/**
 * @param {object} input
 * @param {Capabilities.CustomerAdd} input.capability
 * @param {{ cid: Capabilities.Link }} input.invocation
 * @param {Context} context
 * @returns {Promise<Server.Result<Capabilities.CustomerAddSuccess, Capabilities.CustomerAddFailure>>}
 */
export const add = async ({ capability, invocation }, context) => {
  // we ensure that invocation includes a delegation to the
  const result = await decodeDelegation(capability.nb.access, context)
  if (result.error) {
    return result
  }

  // Store new subscription record
  const subscription = await context.models.subscriptions.add({
    cause: invocation.cid,
    provider: capability.with,
    customer: result.delegation.audience.did(),
    order: capability.nb.order,
  })

  // We detect whether insert occurred or if this operation was a noop
  // by checking if `cause` matches invocation cid. If insert took place
  // we'll save a delegation into delegation store.
  if (subscription.cause.toString() === invocation.cid.toString()) {
    context.models.delegations.putMany(result.delegation)
  }

  return { cause: subscription.cause }
}

/**
 * @param {object} input
 * @param {Capabilities.CustomerList} input.capability
 * @param {Context} context
 * @returns {Promise<Server.Result<Capabilities.CustomerListSuccess, Capabilities.CustomerListFailure>>}
 */
export const list = async ({ capability }, context) => {
  const subscriptions = await context.models.subscriptions.find({
    provider: capability.with,
    customer: capability.nb.customer,
    order: capability.nb.order,
  })

  return { results: subscriptions }
}

/**
 *
 * @param {Uint8Array} bytes
 * @param {object} context
 * @param {Server.Signer<Server.API.DID<'web'>>} context.signer
 */

export const decodeDelegation = async (bytes, context) => {
  // we ensure that invocation includes a delegation to the
  const result = await claim(Consumer.consumer, bytesToDelegations(bytes), {
    // ⚠️ This will not going to work when provider did is different from
    // service did as we'll need a way to resolve provider key.
    authority: context.signer,
    principal: Verifier,
  })

  if (result.error) {
    return new Failure(
      `Expected 'nb.access' to delegate 'consumer/*' which is not the case: ${result}`
    )
  }

  if (result.delegation.expiration === Infinity) {
    return new Failure(
      `Expect 'nb.access' to delegate non-expiring 'consumer/*' capability to the customer`
    )
  }

  return result
}

/**
 * @param {import('../bindings').RouteContext} context
 */
export const provide = (context) => ({
  add: Server.provide(Customer.add, (input) => add(input, context)),
  list: Server.provide(Customer.list, (input) => list(input, context)),
})

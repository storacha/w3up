/* eslint-disable unicorn/new-for-builtins, max-depth */
import * as Server from '@ucanto/server'
import { Verifier } from '@ucanto/principal'
import { Customer, Consumer } from '@web3-storage/capabilities'
import * as Capabilities from '@web3-storage/capabilities/types'
import {
  bytesToDelegations,
  delegationsToBytes,
} from '@web3-storage/access/encoding'
import { codec as CBOR } from '@ucanto/transport/cbor'
import * as Mailto from '../utils/did-mailto.js'
import { claim, Failure } from '@ucanto/validator'

/**
 * @typedef {object} Context
 * @property {object} models
 * @property {import('../types/subscriptions').SubscriptionStore} models.subscriptions
 * @property {import('../types/delegations').DelegationStore} models.delegations
 * @property {Server.Signer<Server.API.DID<'web'>>} signer
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
  const result = await decodeAuthorization(capability.nb.access, context)
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

  if (subscription.error) {
    return new Failure(`Failed to create subscription: ${subscription}`)
  }

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

export const decodeAuthorization = async (bytes, context) => {
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

/**
 * @param {object} input
 * @param {Server.Signer<Server.API.DID<'web'>>} input.provider
 * @param {Server.Principal<Server.API.DID<"mailto">>} input.customer
 */
export const createSubscription = async ({ provider, customer }) => {
  const order = await createOrder({ customer })
  // We want to give account full access to the provider subscription so we
  // delegate `consumer/*` capability to it.
  const access = await createAuthorization({ customer, provider, order })

  const invocation = await Customer.add
    .invoke({
      issuer: provider,
      audience: provider,
      with: provider.did(),
      nb: {
        order,
        access: delegationsToBytes([access]),
      },
    })
    .delegate()

  const [capability] = invocation.capabilities

  return { invocation, capability, order, access }
}

/**
 * Creates an order for the given customer.
 *
 * @param {object} input
 * @param {Server.Principal<Server.API.DID<"mailto">>} input.customer
 */

export const createOrder = async ({ customer }) => {
  const { cid } = await CBOR.write({ mailto: Mailto.toEmail(customer.did()) })
  return cid
}

/**
 * Create an authorization for the given customer that allows them to add/remove
 * consumers to the subscription.
 *
 *
 * @param {object} input
 * @param {Server.API.Link} input.order
 * @param {Server.Signer<Server.API.DID<'web'>>} input.provider
 * @param {Server.Principal<Server.API.DID<"mailto">>} input.customer
 */

export const createAuthorization = async ({ provider, customer, order }) => {
  // We want to give account full access to the provider subscription so we
  // delegate `consumer/*` capability to it.
  return await Consumer.consumer
    .invoke({
      issuer: provider,
      expiration: Infinity,
      audience: customer,
      with: provider.did(),
      nb: {
        order,
      },
    })
    .delegate()
}

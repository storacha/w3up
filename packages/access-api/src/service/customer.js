import * as Server from '@ucanto/server'
import { Customer, Provision } from '@web3-storage/capabilities'
import * as Capabilities from '@web3-storage/capabilities/types'

import { codec as CBOR } from '@ucanto/transport/cbor'
import * as Mailto from '../utils/did-mailto.js'
import { claim, Failure } from '@ucanto/validator'
import { createProvision } from './provision.js'
import { Verifier } from '@ucanto/principal/ed25519'

/**
 * @typedef {object} Context
 * @property {object} models
 * @property {import('../types/subscriptions').SubscriptionStore} models.subscriptions
 * @property {import('../types/delegations').DelegationStore} models.delegations
 * @property {Server.Signer<Server.API.DID<'web'>>} signer
 */

/**
 * @param {object} input
 * @param {{ cid: Capabilities.Link, proofs: Server.Proof[] }} input.invocation
 * @param {Context} context
 * @returns {Promise<Server.Result<Capabilities.CustomerAddSuccess, Capabilities.CustomerAddFailure>>}
 */
export const add = async ({ invocation }, context) => {
  const provision = await claim(Provision.provision, invocation.proofs, {
    // ⚠️ This will not going to work when provider did is different from
    // service did as we'll need a way to resolve provider key.
    authority: context.signer,
    principal: Verifier,
  })

  // we ensure that invocation includes a delegation to the
  if (provision.error) {
    return new Failure(
      `Expected 'nb.access' to delegate 'consumer/*' which is not the case: ${provision}`
    )
  }

  // we only accept delegation without expiration
  if (provision.delegation.expiration === Infinity) {
    return new Failure(
      `Expect 'nb.access' to delegate non-expiring 'consumer/*' capability to the customer`
    )
  }

  // Attempt to to store a new subscription
  const subscription = await context.models.subscriptions.add({
    cause: invocation.cid,
    provision: provision.delegation.cid,
    provider: provision.capability.with,
    customer: provision.capability.nb.customer,
    order: provision.capability.nb.order,
  })

  if (subscription.error) {
    return new Failure(`Failed to create subscription: ${subscription}`)
  }

  // We detect whether insert occurred or if this operation was a noop
  // by checking if `cause` matches invocation cid. If insert took place
  // we'll save a delegation into delegation store.
  if (subscription.cause.toString() === invocation.cid.toString()) {
    context.models.delegations.putMany(provision.delegation)
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
export const createCustomer = async ({ provider, customer }) => {
  const order = await createOrder({ customer })
  // We want to give account full access to the provider subscription so we
  // delegate `provision/*` capability to it.
  const provision = await createProvision({ customer, provider, order })

  const invocation = await Customer.add
    .invoke({
      issuer: provider,
      audience: provider,
      with: provider.did(),
      nb: {
        provision: provision.cid,
      },
      proofs: [provision],
    })
    .delegate()

  const [capability] = invocation.capabilities

  return { invocation, capability, order, provision }
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

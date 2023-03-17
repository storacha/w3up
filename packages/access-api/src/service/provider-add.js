import * as Server from '@ucanto/server'
import { Provider, Schema } from '@web3-storage/capabilities'
import * as API from '../types/index.js'
import * as Capabilities from '@web3-storage/capabilities/types'
import * as Customer from './customer.js'
import { Absentee } from '@ucanto/principal'

/**
 * @typedef {object} Context
 * @property {object} models
 * @property {API.ConsumerStore} models.consumers
 * @property {API.SubscriptionStore} models.subscriptions
 * @property {API.DelegationStore} models.delegations
 * @property {object} config
 * @property {string} config.ENV
 * @property {Server.Signer<Server.API.DID<'web'>>} signer
 *
 * @param {object} input
 * @param {Capabilities.ProviderAdd} input.capability
 * @param {{ cid: Server.API.Link }} input.invocation
 * @param {Context} context
 * @returns {Promise<Server.Result<Capabilities.ProviderAddSuccess, Capabilities.ProviderAddFailure>>}
 */
export const add = async ({ capability, invocation }, context) => {
  // disable until hardened in test/staging
  if (context.config.ENV === 'production') {
    throw new Error(`provider/add invocation handling is not enabled`)
  }

  const { consumer, provider } = capability.nb
  const account = parseAccount(capability.with)
  if (account.error) {
    return new Server.Failure(`Must be invoked with an account: ${account}`)
  }

  if (provider !== context.signer.did()) {
    return new Server.Failure(
      `Expected provider to be '${context.signer.did()}' but got '${provider}' instead`
    )
  }

  // Create a subscription for this account with a provider. If one already
  // exists this will be a noop. If it did not exist one will be created and
  // `consumer/*` capability will be delegated to the account.
  const customer = await Customer.createCustomer({
    provider: context.signer,
    customer: account,
  })
  const result = await Customer.add(customer, context)
  // This should never happen because adding same subscription twice is a noop
  // yet we check and propagate error just in case.
  if (result.error) {
    return result
  }

  // Then we add a consumer to subscription for the account
  return await context.models.consumers.add({
    cause: invocation.cid,
    provider: context.signer.did(),
    consumer,
    order: customer.order,
  })
}

/**
 * @param {string} input
 * @returns {Server.Result<Server.API.UCAN.Signer<Server.API.DID<'mailto'>>, Server.API.Failure>}
 */
export const parseAccount = (input) => {
  const result = Schema.Account.read(input)
  if (result.error) {
    return result
  }
  return Absentee.from({ id: result })
}

/**
 * @param {Context} context
 */
export const provide = (context) =>
  Server.provide(Provider.add, async (input) => add(input, context))

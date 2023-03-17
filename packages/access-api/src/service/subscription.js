import * as Server from '@ucanto/server'
import { Subscription } from '@web3-storage/capabilities'
import * as Capabilities from '@web3-storage/capabilities/types'

/**
 * @typedef {object} Context
 * @property {object} models
 * @property {import('../types/subscriptions').SubscriptionStore} models.subscriptions
 * @property {Server.Signer<Server.API.DID<'web'>>} signer
 * @property {URL} url
 * @property {import('../bindings').Email} email
 */

/**
 * @param {object} input
 * @param {Capabilities.SubscriptionList} input.capability
 * @param {Context} context
 * @returns {Promise<Server.Result<Capabilities.SubscriptionListSuccess, Capabilities.SubscriptionListFailure>>}
 */
export const list = async ({ capability }, context) => {
  const subscriptions = await context.models.subscriptions.find({
    customer: capability.with,
    provider: capability.nb.provider,
    order: capability.nb.order,
  })

  return { results: subscriptions }
}

/**
 * @param {import('../bindings').RouteContext} context
 */
export const provide = (context) => ({
  list: Server.provide(Subscription.list, (input) => list(input, context)),
})

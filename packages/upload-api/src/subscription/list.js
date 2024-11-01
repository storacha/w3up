import * as API from '../types.js'
import * as Server from '@ucanto/server'
import { Subscription } from '@storacha/capabilities'

/**
 * @param {API.SubscriptionServiceContext} context
 */
export const provide = (context) =>
  Server.provide(Subscription.list, (input) => list(input, context))

/**
 * @param {API.Input<Subscription.list>} input
 * @param {API.SubscriptionServiceContext} context
 * @returns {Promise<API.Result<API.SubscriptionListSuccess, API.SubscriptionListFailure>>}
 */
const list = async ({ capability }, context) =>
  context.subscriptionsStorage.list(capability.with)

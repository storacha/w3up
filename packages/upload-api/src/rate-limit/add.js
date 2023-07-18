import * as Server from '@ucanto/server'
import * as API from '../types.js'
import * as RateLimit from '@web3-storage/capabilities/rate-limit'

/**
 * @param {API.RateLimitsServiceContext} ctx
 */
export const provide = (ctx) =>
  Server.provide(RateLimit.add, (input) => add(input, ctx))

/**
 * @param {API.Input<RateLimit.add>} input
 * @param {API.RateLimitsServiceContext} ctx
 */
export const add = async ({ capability }, ctx) => {
  return ctx.rateLimitsStorage.add(capability.nb.subject, capability.nb.rate)
}

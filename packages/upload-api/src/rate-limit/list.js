import * as Server from '@ucanto/server'
import * as API from '../types.js'
import * as RateLimit from '@web3-storage/capabilities/rate-limit'

/**
 * @param {API.RateLimitsServiceContext} ctx
 */
export const provide = (ctx) =>
  Server.provide(RateLimit.list, (input) => list(input, ctx))

/**
 * @param {API.Input<RateLimit.list>} input
 * @param {API.RateLimitsServiceContext} ctx
 */
export const list = async ({ capability }, ctx) => {
  return ctx.rateLimitsStorage.list(capability.nb.subject)
}

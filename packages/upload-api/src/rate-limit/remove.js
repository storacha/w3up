import * as Server from '@ucanto/server'
import * as API from '../types.js'
import * as RateLimit from '@storacha/capabilities/rate-limit'

/**
 * @param {API.RateLimitServiceContext} ctx
 */
export const provide = (ctx) =>
  Server.provide(RateLimit.remove, (input) => remove(input, ctx))

/**
 * @param {API.Input<RateLimit.remove>} input
 * @param {API.RateLimitServiceContext} ctx
 */
export const remove = async ({ capability }, ctx) => {
  return ctx.rateLimitsStorage.remove(capability.nb.id)
}

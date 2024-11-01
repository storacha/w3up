import * as Server from '@ucanto/server'
import * as API from '../types.js'
import * as RateLimit from '@storacha/capabilities/rate-limit'

/**
 * @param {API.RateLimitServiceContext} ctx
 */
export const provide = (ctx) =>
  Server.provide(RateLimit.list, (input) => list(input, ctx))

/**
 * @param {API.Input<RateLimit.list>} input
 * @param {API.RateLimitServiceContext} ctx
 */
export const list = async ({ capability }, ctx) => {
  const result = await ctx.rateLimitsStorage.list(capability.nb.subject)
  if (result.ok) {
    return Server.ok({ limits: result.ok })
  } else {
    return result
  }
}

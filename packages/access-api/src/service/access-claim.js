import * as Server from '@ucanto/server'
import { claim } from '@web3-storage/capabilities/access'
import * as Ucanto from '@ucanto/interface'

/**
 * @param {import('../bindings').RouteContext} ctx
 */
export function accessClaimProvider(ctx) {
  return Server.provide(claim, async ({ capability, invocation }) => {
    return {}
  })
}

/**
 * @callback AccessClaimHandler
 * @param {Ucanto.Invocation<import('@web3-storage/capabilities/types').AccessClaim>} invocation
 * @returns {Promise<Ucanto.Result<unknown, { error: true }>>}
 */

/**
 * @returns {AccessClaimHandler}
 */
export function createAccessClaimHandler() {
  return async (invocation) => {
    return {}
  }
}

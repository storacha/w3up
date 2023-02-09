import * as Server from '@ucanto/server'
import { claim } from '@web3-storage/capabilities/access'

/**
 * @param {import('../bindings').RouteContext} ctx
 */
export function accessClaimProvider(ctx) {
  return Server.provide(claim, async ({ capability, invocation }) => {
    return {}
  })
}

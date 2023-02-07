import * as Server from '@ucanto/server'
import { delegate } from '@web3-storage/capabilities/access'

/**
 * @param {import('../bindings').RouteContext} ctx
 */
export function accessDelegateProvider(ctx) {
  return Server.provide(delegate, async ({ capability, invocation }) => {
    return {}
  })
}

import * as Ucanto from '@ucanto/interface'
import * as Server from '@ucanto/server'
import { Provider } from '@web3-storage/capabilities'

/**
 * @typedef {import('@web3-storage/capabilities/types').ProviderAdd} ProviderAdd
 * @typedef {import('@web3-storage/capabilities/types').ProviderAddSuccess} ProviderAddSuccess
 * @typedef {import('@web3-storage/capabilities/types').ProviderAddFailure} ProviderAddFailure
 */

/**
 * @callback ProviderAddHandler
 * @param {Ucanto.Invocation<import('@web3-storage/capabilities/types').ProviderAdd>} invocation
 * @returns {Promise<Ucanto.Result<ProviderAddSuccess, ProviderAddFailure>>}
 */

/**
 * @returns {ProviderAddHandler}
 */
export function createProviderAddHandler() {
  /** @type {ProviderAddHandler} */
  return async (invocation) => {
    return {
      error: true,
      name: 'NotImplemented',
      message: 'Provider add not implemented yet',
    }
  }
}

/**
 * @param {import('../bindings').RouteContext} ctx
 */
export function providerAddProvider(ctx) {
  return Server.provide(Provider.add, async ({ invocation }) => {
    const handler = createProviderAddHandler()
    return handler(/** @type {Ucanto.Invocation<ProviderAdd>} */ (invocation))
  })
}

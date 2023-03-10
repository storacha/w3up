import * as Ucanto from '@ucanto/interface'
import * as Server from '@ucanto/server'
import { Provider } from '@web3-storage/capabilities'
import * as validator from '@ucanto/validator'

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
 * @param {object} options
 * @param {import('../types/provisions').ProvisionsStorage} options.provisions
 * @returns {ProviderAddHandler}
 */
export function createProviderAddHandler(options) {
  /** @type {ProviderAddHandler} */
  return async (invocation) => {
    const [providerAddCap] = invocation.capabilities
    const {
      nb: { consumer, provider },
      with: accountDID,
    } = providerAddCap
    if (!validator.DID.match({ method: 'mailto' }).is(accountDID)) {
      return {
        error: true,
        name: 'Unauthorized',
        message: 'Issuer must be a mailto DID',
      }
    }
    await options.provisions.put({
      invocation,
      space: consumer,
      provider,
      account: accountDID,
    })
    return {}
  }
}

/**
 * @param {object} ctx
 * @param {Pick<import('../bindings').RouteContext['models'], 'provisions'>} ctx.models
 */
export function providerAddProvider(ctx) {
  return Server.provide(Provider.add, async ({ invocation }) => {
    const handler = createProviderAddHandler({
      provisions: ctx.models.provisions,
    })
    return handler(/** @type {Ucanto.Invocation<ProviderAdd>} */ (invocation))
  })
}

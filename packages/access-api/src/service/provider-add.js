import * as Ucanto from '@ucanto/interface'

/**
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
    return {}
  }
}

import * as Server from '@ucanto/server'
import * as Store from '@web3-storage/capabilities/store'
import * as API from '../types.js'

/**
 * @param {API.Input<Store.confirm>} input
 * @param {API.StoreServiceContext} context
 * @returns {Promise<API.Result<API.StoreConfirmSuccess, API.StoreConfirmFailure> | API.JoinBuilder<API.StoreConfirmSuccess>>}
 */
export const storeConfirm = async ({ capability }, context) => {
  const { link } = capability.nb
  return Server.ok({ link })
}

/**
 * @param {API.StoreServiceContext} context
 * @returns {API.ServiceMethod<API.StoreConfirm, API.StoreConfirmSuccess, API.StoreConfirmFailure>}
 */
export function storeConfirmProvider(context) {
  return Server.provideAdvanced({
    capability: Store.confirm,
    handler: (input) => storeConfirm(input, context)
  })
}

import * as Server from '@ucanto/server'
import * as Store from '@web3-storage/capabilities/store'
import * as API from '../types.js'

/**
 * @param {API.StoreServiceContext} context
 * @returns {API.ServiceMethod<API.StoreRemove, API.StoreRemoveOk, API.Failure>}
 */
export function storeRemoveProvider(context) {
  return Server.provide(Store.remove, async ({ capability }) => {
    const { link } = capability.nb
    const space = Server.DID.parse(capability.with).did()

    await context.storeTable.remove(space, link)

    return {}
  })
}

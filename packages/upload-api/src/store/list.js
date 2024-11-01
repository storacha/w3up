import * as Server from '@ucanto/server'
import * as Store from '@storacha/capabilities/store'
import * as API from '../types.js'

/**
 * @param {API.StoreServiceContext} context
 * @returns {API.ServiceMethod<API.StoreList, API.StoreListSuccess, API.Failure>}
 */
export function storeListProvider(context) {
  return Server.provide(Store.list, async ({ capability }) => {
    const { cursor, size, pre } = capability.nb
    const space = Server.DID.parse(capability.with).did()
    return await context.storeTable.list(space, { size, cursor, pre })
  })
}

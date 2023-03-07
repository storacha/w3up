import * as Server from '@ucanto/server'
import * as Store from '@web3-storage/capabilities/store'
import * as API from '../types.js'

/**
 * @param {API.StoreServiceContext} context
 * @returns {API.ServiceMethod<API.StoreList, API.StoreListOk, API.Failure>}
 */
export function storeListProvider(context) {
  return Server.provide(Store.list, async ({ capability }) => {
    const { cursor, size, pre } = capability.nb
    const space = Server.DID.parse(capability.with).did()

    return await context.storeTable.list(space, {
      size,
      cursor,
      pre,
    })
  })
}

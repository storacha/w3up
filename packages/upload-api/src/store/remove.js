import * as Server from '@ucanto/server'
import * as Store from '@web3-storage/capabilities/store'
import * as API from '../types.js'

/**
 * @param {API.StoreServiceContext} context
 * @returns {API.ServiceMethod<API.StoreRemove, API.StoreRemoveSuccess, API.StoreRemoveFailure>}
 */
export function storeRemoveProvider(context) {
  return Server.provide(Store.remove, async ({ capability }) => {
    const { link } = capability.nb
    const space = Server.DID.parse(capability.with).did()

    const item = await context.storeTable.get(space, link)
    if (!item) {
      return Server.error(new StoreItemNotFound())
    }

    await context.storeTable.remove(space, link)

    return Server.ok({ size: item.size })
  })
}

class StoreItemNotFound extends Server.Failure {
  get name () {
    return 'StoreItemNotFound'
  }
}

import * as Server from '@ucanto/server'
import * as Store from '@storacha/capabilities/store'
import * as API from '../types.js'
import { StoreItemNotFound } from './lib.js'

/**
 * @param {API.StoreServiceContext} context
 * @returns {API.ServiceMethod<API.StoreRemove, API.StoreRemoveSuccess, API.StoreRemoveFailure>}
 */
export function storeRemoveProvider(context) {
  return Server.provide(Store.remove, async ({ capability }) => {
    const { link } = capability.nb
    const space = Server.DID.parse(capability.with).did()

    const res = await context.storeTable.remove(space, link)
    if (res.error && res.error.name === 'RecordNotFound') {
      return Server.error(new StoreItemNotFound(space, link))
    }

    return res
  })
}

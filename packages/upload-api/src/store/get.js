import * as Server from '@ucanto/server'
import * as Store from '@storacha/capabilities/store'
import * as API from '../types.js'
import { StoreItemNotFound } from './lib.js'

/**
 * @param {API.StoreServiceContext} context
 * @returns {API.ServiceMethod<API.StoreGet, API.StoreGetSuccess, API.StoreGetFailure>}
 */
export function storeGetProvider(context) {
  return Server.provide(Store.get, async ({ capability }) => {
    const { link } = capability.nb
    if (!link) {
      return Server.fail('nb.link must be set')
    }
    const space = Server.DID.parse(capability.with).did()
    const res = await context.storeTable.get(space, link)
    if (res.error && res.error.name === 'RecordNotFound') {
      return Server.error(new StoreItemNotFound(space, link))
    }
    return res
  })
}

import * as Server from '@ucanto/server'
import * as Store from '@web3-storage/capabilities/store'
import * as API from '../types.js'

/**
 * @param {API.StoreServiceContext} context
 * @returns {API.ServiceMethod<API.StoreGet, API.StoreGetOk, API.Failure>}
 */
export function storeGetProvider(context) {
  return Server.provide(Store.get, async ({ capability }) => {
    const { link } = capability.nb
    if (!link) {
      return Server.fail('nb.link must be set')
    }
    const space = Server.DID.parse(capability.with).did()
    const res = await context.storeTable.get(space, link)
    if (!res) {
      return { 
        error: {
          name: 'ShardNotFound',
          message: 'Shard not found'
        }
      }
    }
    return {
      ok: res
    }
  })
}

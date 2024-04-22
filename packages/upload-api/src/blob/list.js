import * as Server from '@ucanto/server'
import * as Blob from '@web3-storage/capabilities/blob'
import * as API from '../types.js'

/**
 * @param {API.BlobServiceContext} context
 * @returns {API.ServiceMethod<API.BlobList, API.BlobListSuccess, API.Failure>}
 */
export function blobListProvider(context) {
  return Server.provide(Blob.list, async ({ capability }) => {
    const space = capability.with
    const { cursor, size } = capability.nb
    return await context.allocationsStorage.list(space, { size, cursor })
  })
}

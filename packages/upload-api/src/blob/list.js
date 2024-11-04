import * as Server from '@ucanto/server'
import * as SpaceBlob from '@storacha/capabilities/space/blob'
import * as API from '../types.js'

/**
 * @param {API.BlobServiceContext} context
 * @returns {API.ServiceMethod<API.SpaceBlobList, API.SpaceBlobListSuccess, API.Failure>}
 */
export function blobListProvider(context) {
  return Server.provide(SpaceBlob.list, async ({ capability }) => {
    const space = capability.with
    const { cursor, size } = capability.nb
    return await context.registry.entries(space, { size, cursor })
  })
}

import * as Server from '@ucanto/server'
import * as Upload from '@web3-storage/capabilities/upload'
import * as API from '../types.js'

/**
 * @param {API.UploadServiceContext} context
 * @returns {API.ServiceMethod<API.UploadRemove, API.UploadRemoveOk | null, API.Failure>}
 */
export function uploadRemoveProvider(context) {
  return Server.provide(Upload.remove, async ({ capability }) => {
    const { root } = capability.nb
    const space = Server.DID.parse(capability.with).did()

    const result = await context.uploadTable.remove(space, root)
    return result
  })
}

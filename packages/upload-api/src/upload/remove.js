import * as Server from '@ucanto/server'
import * as Upload from '@storacha/capabilities/upload'
import * as API from '../types.js'
import { UploadNotFound } from './lib.js'

/**
 * @param {API.UploadServiceContext} context
 * @returns {API.ServiceMethod<API.UploadRemove, API.UploadRemoveSuccess, API.Failure>}
 */
export function uploadRemoveProvider(context) {
  return Server.provide(Upload.remove, async ({ capability }) => {
    const { root } = capability.nb
    const space = Server.DID.parse(capability.with).did()

    const res = await context.uploadTable.remove(space, root)
    if (res.error && res.error.name === 'RecordNotFound') {
      return Server.error(new UploadNotFound(space, root))
    }

    return res
  })
}

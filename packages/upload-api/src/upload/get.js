import * as Server from '@ucanto/server'
import * as Upload from '@storacha/capabilities/upload'
import * as API from '../types.js'
import { UploadNotFound } from './lib.js'

/**
 * @param {API.UploadServiceContext} context
 * @returns {API.ServiceMethod<API.UploadGet, API.UploadGetSuccess, API.UploadGetFailure>}
 */
export function uploadGetProvider(context) {
  return Server.provide(Upload.get, async ({ capability }) => {
    const { root } = capability.nb
    if (!root) {
      return Server.fail('nb.root must be set')
    }
    const space = Server.DID.parse(capability.with).did()
    const res = await context.uploadTable.get(space, root)
    if (res.error && res.error.name === 'RecordNotFound') {
      return Server.error(new UploadNotFound(space, root))
    }
    return res
  })
}

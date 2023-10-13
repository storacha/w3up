import * as Server from '@ucanto/server'
import * as Upload from '@web3-storage/capabilities/upload'
import * as API from '../types.js'

/**
 * @param {API.UploadServiceContext} context
 * @returns {API.ServiceMethod<API.UploadGet, API.UploadGetOk, API.Failure>}
 */
export function uploadGetProvider(context) {
  return Server.provide(Upload.get, async ({ capability }) => {
    const { root } = capability.nb
    if (!root) {
      return Server.fail('nb.root must be set')
    }
    const space = Server.DID.parse(capability.with).did()
    const res = await context.uploadTable.get(space, root)
    if (!res) {
      return { 
        error: {
          name: 'UploadNotFound',
          message: 'Upload not found'
        }
      }
    }
    return {
      ok: res
    }
  })
}

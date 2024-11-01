import * as Server from '@ucanto/server'
import * as SpaceBlob from '@storacha/capabilities/space/blob'
import * as Digest from 'multiformats/hashes/digest'
import * as API from '../types.js'

import { RecordNotFoundErrorName } from '../errors.js'

/**
 * @param {API.BlobServiceContext} context
 * @returns {API.ServiceMethod<API.SpaceBlobRemove, API.BlobRemoveSuccess, API.BlobRemoveFailure>}
 */
export function blobRemoveProvider(context) {
  return Server.provide(SpaceBlob.remove, async ({ capability }) => {
    const space = capability.with
    const digest = Digest.decode(capability.nb.digest)

    const res = await context.allocationsStorage.remove(space, digest)
    if (res.error && res.error.name === RecordNotFoundErrorName) {
      return {
        ok: {
          size: 0,
        },
      }
    }

    return res
  })
}

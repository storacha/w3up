import * as Server from '@ucanto/server'
import * as SpaceBlob from '@storacha/capabilities/space/blob'
import * as Digest from 'multiformats/hashes/digest'
import * as API from '../types.js'

/**
 * @param {API.BlobServiceContext} context
 * @returns {API.ServiceMethod<API.SpaceBlobRemove, API.SpaceBlobRemoveSuccess, API.SpaceBlobRemoveFailure>}
 */
export function blobRemoveProvider(context) {
  return Server.provide(
    SpaceBlob.remove,
    async ({ capability, invocation }) => {
      const space = capability.with
      const digest = Digest.decode(capability.nb.digest)

      const exists = await context.registry.find(space, digest)
      if (exists.error) {
        if (exists.error.name === 'EntryNotFound') {
          return Server.ok({ size: 0 })
        }
        return exists
      }

      const dereg = await context.registry.deregister({
        space,
        digest,
        cause: invocation.link(),
      })
      if (dereg.error) {
        // unlikely as we just found it...but possible I guess
        if (dereg.error.name === 'EntryNotFound') {
          return Server.ok({ size: 0 })
        }
        return dereg
      }

      return Server.ok({ size: exists.ok?.blob.size })
    }
  )
}

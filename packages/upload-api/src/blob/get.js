import * as Server from '@ucanto/server'
import * as SpaceBlob from '@storacha/capabilities/space/blob'
import * as Digest from 'multiformats/hashes/digest'
import * as API from '../types.js'
import { BlobNotFound } from './lib.js'

/**
 * @param {API.BlobServiceContext} context
 * @returns {API.ServiceMethod<API.SpaceBlobGet, API.SpaceBlobGetSuccess, API.SpaceBlobGetFailure>}
 */
export function blobGetProvider(context) {
  return Server.provide(SpaceBlob.get, async ({ capability }) => {
    const digest = Digest.decode(capability.nb.digest)
    const space = Server.DID.parse(capability.with).did()
    const res = await context.registry.find(space, digest)
    if (res.error) {
      if (res.error.name === 'EntryNotFound') {
        return Server.error(new BlobNotFound(digest))
      }
      return res
    }

    return Server.ok({
      blob: {
        digest: res.ok.blob.digest.bytes,
        size: res.ok.blob.size,
      },
      cause: res.ok.cause,
      insertedAt: res.ok.insertedAt.toISOString(),
    })
  })
}

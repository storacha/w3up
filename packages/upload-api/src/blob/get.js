import * as Server from '@ucanto/server'
import * as SpaceBlob from '@storacha/capabilities/space/blob'
import * as Digest from 'multiformats/hashes/digest'
import * as API from '../types.js'
import { BlobNotFound } from './lib.js'

/**
 * @param {API.BlobServiceContext} context
 * @returns {API.ServiceMethod<API.SpaceBlobGet, API.BlobGetSuccess, API.BlobGetFailure>}
 */
export function blobGetProvider(context) {
  return Server.provide(SpaceBlob.get, async ({ capability }) => {
    const digest = Digest.decode(capability.nb.digest)
    const space = Server.DID.parse(capability.with).did()
    const res = await context.allocationsStorage.get(space, digest)
    if (res.error && res.error.name === 'RecordNotFound') {
      return Server.error(new BlobNotFound(digest))
    }
    return res
  })
}

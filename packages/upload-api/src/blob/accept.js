import * as Server from '@ucanto/server'
import * as DID from '@ipld/dag-ucan/did'
import * as W3sBlob from '@web3-storage/capabilities/web3.storage/blob'
import { Assert } from '@web3-storage/content-claims/capability'
import { create as createLink } from 'multiformats/link'
import * as Digest from 'multiformats/hashes/digest'
import { code as rawCode } from 'multiformats/codecs/raw'
import * as API from '../types.js'
import { AllocatedMemoryHadNotBeenWrittenTo } from './lib.js'

/**
 * @param {API.W3ServiceContext} context
 * @returns {API.ServiceMethod<API.BlobAccept, API.BlobAcceptSuccess, API.BlobAcceptFailure>}
 */
export function blobAcceptProvider(context) {
  return Server.provideAdvanced({
    capability: W3sBlob.accept,
    handler: async ({ capability }) => {
      const { blob, space } = capability.nb
      // If blob is not stored, we must fail
      const hasBlob = await context.blobsStorage.has(blob.digest)
      if (hasBlob.error) {
        return hasBlob
      } else if (!hasBlob.ok) {
        return {
          error: new AllocatedMemoryHadNotBeenWrittenTo(),
        }
      }

      const digest = Digest.decode(blob.digest)
      const content = createLink(rawCode, digest)
      const createUrl = await context.blobsStorage.createDownloadUrl(digest.bytes)
      if (createUrl.error) {
        return createUrl
      }

      const locationClaim = await Assert.location.delegate({
        issuer: context.id,
        audience: DID.parse(space),
        with: context.id.toDIDKey(),
        nb: {
          content,
          location: [createUrl.ok],
        },
        expiration: Infinity,
      })

      // Create result object
      /** @type {API.OkBuilder<API.BlobAcceptSuccess, API.BlobAcceptFailure>} */
      const result = Server.ok({
        site: locationClaim.cid,
      })

      return result.fork(locationClaim)
    },
  })
}

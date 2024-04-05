import * as Server from '@ucanto/server'
import * as W3sBlob from '@web3-storage/capabilities/web3.storage/blob'
import { Assert } from '@web3-storage/content-claims/capability'
import { create as createLink } from 'multiformats/link'
import { Digest } from 'multiformats/hashes/digest'
import { sha256 } from 'multiformats/hashes/sha2'
import { CAR } from '@ucanto/core'
import * as API from '../types.js'
import { BlobItemNotFound } from './lib.js'

/**
 * @param {API.W3ServiceContext} context
 * @returns {API.ServiceMethod<API.BlobAccept, API.BlobAcceptSuccess, API.BlobAcceptFailure>}
 */
export function blobAcceptProvider(context) {
  return Server.provideAdvanced({
    capability: W3sBlob.accept,
    handler: async ({ capability }) => {
      const { blob } = capability.nb
      // If blob is not stored, we must fail
      const hasBlob = await context.blobsStorage.has(blob.content)
      if (hasBlob.error) {
        return {
          error: new BlobItemNotFound(),
        }
      }

      const digest = new Digest(sha256.code, 32, blob.content, blob.content)
      const content = createLink(CAR.code, digest)
      const w3link = `https://w3s.link/ipfs/${content.toString()}`

      // TODO: Set bucket name
      // TODO: return content commitment
      const locationClaim = await Assert.location
        .invoke({
          issuer: context.id,
          // TODO: we need user agent DID
          audience: context.id,
          with: context.id.toDIDKey(),
          nb: {
            content,
            location: [
              // @ts-expect-error Type 'string' is not assignable to type '`${string}:${string}`'
              w3link
            ]
          },
          expiration: Infinity,
        })
        .delegate()
      // TODO: we need to support multihash in claims, or specify hardcoded codec

      // Create result object
      /** @type {API.OkBuilder<API.BlobAcceptSuccess, API.BlobAcceptFailure>} */
      const result = Server.ok({
        claim: locationClaim.cid
      })

      return result
        .fork(locationClaim)
    }
  })
}

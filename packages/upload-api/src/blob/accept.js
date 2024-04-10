import * as Server from '@ucanto/server'
import * as DID from '@ipld/dag-ucan/did'
import * as W3sBlob from '@web3-storage/capabilities/web3.storage/blob'
import { Assert } from '@web3-storage/content-claims/capability'
import { create as createLink } from 'multiformats/link'
import { Digest } from 'multiformats/hashes/digest'
import { sha256 } from 'multiformats/hashes/sha2'
import { CAR } from '@ucanto/core'
import * as API from '../types.js'
import { BlobItemNotFound } from './lib.js'

const R2_REGION = 'auto'
const R2_BUCKET = 'carpark-prod-0'

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
        return {
          error: new BlobItemNotFound(),
        }
      }

      // TODO: we need to support multihash in claims, or specify hardcoded codec
      const digest = new Digest(sha256.code, 32, blob.digest, blob.digest)
      const content = createLink(CAR.code, digest)
      const w3link = `https://w3s.link/ipfs/${content.toString()}?origin=r2://${R2_REGION}/${R2_BUCKET}`

      const locationClaim = await Assert.location
        .invoke({
          issuer: context.id,
          audience: DID.parse(space),
          with: context.id.toDIDKey(),
          nb: {
            content,
            location: [
              // @ts-expect-error Type 'string' is not assignable to type '`${string}:${string}`'
              w3link,
            ],
          },
          expiration: Infinity,
        })
        .delegate()

      // Create result object
      /** @type {API.OkBuilder<API.BlobAcceptSuccess, API.BlobAcceptFailure>} */
      const result = Server.ok({
        site: locationClaim.cid,
      })

      return result.fork(locationClaim)
    },
  })
}

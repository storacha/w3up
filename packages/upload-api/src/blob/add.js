import * as Server from '@ucanto/server'
import * as Blob from '@web3-storage/capabilities/blob'
import * as API from '../types.js'

import { BlobItemSizeExceeded } from './lib.js'

/**
 * @param {API.BlobServiceContext} context
 * @returns {API.ServiceMethod<API.BlobAdd, API.BlobAddSuccess, API.BlobAddFailure>}
 */
export function blobAddProvider(context) {
  return Server.provideAdvanced({
    capability: Blob.add,
    handler: async ({ capability, invocation }) => {
      const { id, allocationStorage, maxUploadSize, getServiceConnection } = context
      const { blob } = capability.nb
      const space = /** @type {import('@ucanto/interface').DIDKey} */ (
        Server.DID.parse(capability.with).did()
      )

      if (blob.size > maxUploadSize) {
        return {
          error: new BlobItemSizeExceeded(maxUploadSize)
        }
      }

      // Create effects for receipt
      // TODO: needs HTTP/PUT receipt
      const blobAllocate = Blob.allocate
        .invoke({
          issuer: id,
          audience: id,
          with: id.did(),
          nb: {
            blob,
            cause: invocation.link(),
            space,
          },
          expiration: Infinity
        })
      const blobAccept = Blob.accept
        .invoke({
          issuer: id,
          audience: id,
          with: id.toDIDKey(),
          nb: {
            blob,
            exp: Number.MAX_SAFE_INTEGER,
          },
          expiration: Infinity,
        })
      const [allocatefx, acceptfx] = await Promise.all([
        blobAllocate.delegate(),
        blobAccept.delegate(),
      ])

      // Schedule allocation if not allocated
      const allocated = await allocationStorage.exists(space, blob.content)
      if (!allocated.ok) {
        // Execute allocate invocation
        const allocateRes = await blobAllocate.execute(getServiceConnection())
        if (allocateRes.out.error) {
          return {
            error: allocateRes.out.error
          }
        }
      }

      /** @type {API.OkBuilder<API.BlobAddSuccess, API.BlobAddFailure>} */
      const result = Server.ok({
        claim: {
          'await/ok': acceptfx.link(),
        },
      })
      return result.fork(allocatefx.link()).join(acceptfx.link())
    },
  })
}

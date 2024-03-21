import * as Server from '@ucanto/server'
import * as Blob from '@web3-storage/capabilities/blob'
import * as API from '../types.js'

/**
 * @param {API.BlobServiceContext} context
 * @returns {API.ServiceMethod<API.BlobAdd, API.BlobAddSuccess, API.BlobAddFailure>}
 */
export function blobAddProvider(context) {
  return Server.provideAdvanced({
    capability: Blob.add,
    handler: async ({ capability }) => {
      const { id, allocationStore, maxUploadSize } = context
      const { content, size } = capability.nb
      const space = /** @type {import('@ucanto/interface').DIDKey} */ (
        Server.DID.parse(capability.with).did()
      )

      if (size > maxUploadSize) {
        return {
          error: new Server.Failure(
            `Maximum size exceeded: ${maxUploadSize}, split DAG into smaller shards.`
          ),
        }
      }
      
      // Create effects for receipt
      const [allocatefx, acceptfx] = await Promise.all([
        Blob.allocate
          .invoke({
            issuer: id,
            audience: id,
            with: id.toDIDKey(),
            nb: {
              content,
              size,
            },
            expiration: Infinity,
          })
          .delegate(),
        Blob.accept
          .invoke({
            issuer: id,
            audience: id,
            with: id.toDIDKey(),
            nb: {
              content,
              exp: Number.POSITIVE_INFINITY,
            },
            expiration: Infinity,
          })
          .delegate(),
      ])

      // Queue for allocation if not allocated
      const allocated = await allocationStore.exists(space, content)
      if (!allocated.ok) {
        // TODO
      }

      /** @type {API.OkBuilder<API.BlobAddSuccess, API.BlobAddFailure>} */
      const result = Server.ok({
        claim: {
          'await/ok': acceptfx.link()
        }
      })
      return result.fork(allocatefx.link()).join(acceptfx.link())
    }
  })
}

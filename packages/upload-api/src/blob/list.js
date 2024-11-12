import * as Server from '@ucanto/server'
import * as SpaceBlob from '@storacha/capabilities/space/blob'
import * as API from '../types.js'

/**
 * @param {API.BlobServiceContext} context
 * @returns {API.ServiceMethod<API.SpaceBlobList, API.SpaceBlobListSuccess, API.Failure>}
 */
export function blobListProvider(context) {
  return Server.provide(SpaceBlob.list, async ({ capability }) => {
    const space = capability.with
    const { cursor, size } = capability.nb
    const result = await context.registry.entries(space, { size, cursor })
    if (result.error) {
      return result
    }
    return Server.ok({
      ...result.ok,
      results: result.ok.results.map((r) => ({
        blob: {
          digest: r.blob.digest.bytes,
          size: r.blob.size,
        },
        cause: r.cause,
        insertedAt: r.insertedAt.toISOString(),
      })),
    })
  })
}

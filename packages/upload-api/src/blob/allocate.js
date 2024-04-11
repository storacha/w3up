import * as Server from '@ucanto/server'
import * as W3sBlob from '@web3-storage/capabilities/web3.storage/blob'
import * as API from '../types.js'

/**
 * @param {API.W3ServiceContext} context
 * @returns {API.ServiceMethod<API.BlobAllocate, API.BlobAllocateSuccess, API.BlobAllocateFailure>}
 */
export function blobAllocateProvider(context) {
  return Server.provide(
    W3sBlob.allocate,
    async ({ capability, invocation }) => {
      const { blob, cause, space } = capability.nb
      let size = blob.size

      // We check if space has storage provider associated. If it does not
      // we return `InsufficientStorage` error as storage capacity is considered
      // to be 0.
      const result = await context.provisionsStorage.hasStorageProvider(space)
      if (result.error) {
        return result
      }
      if (!result.ok) {
        return {
          /** @type {API.AllocationError} */
          error: {
            name: 'InsufficientStorage',
            message: `${space} has no storage provider`,
          },
        }
      }

      // Allocate memory space for the blob. If memory for this blob is
      // already allocated, this allocates 0 bytes.
      const allocationInsert = await context.allocationsStorage.insert({
        space,
        blob,
        invocation: cause,
      })
      if (allocationInsert.error) {
        // if the insert failed with conflict then this item has already been
        // added to the space and there is no allocation change.
        // If record exists but is expired, it can be re-written
        if (allocationInsert.error.name === 'RecordKeyConflict') {
          size = 0
        } else {
          return {
            error: allocationInsert.error,
          }
        }
      }

      // Check if blob already exists
      const hasBlobStore = await context.blobsStorage.has(blob.digest)
      if (hasBlobStore.error) {
        return hasBlobStore
      }

      // If blob is stored, we can just allocate it to the space with the allocated size
      if (hasBlobStore.ok) {
        return {
          ok: { size },
        }
      }

      // Get presigned URL for the write target
      const expiresIn = 60 * 60 * 24 // 1 day
      const expiresAt = new Date(Date.now() + expiresIn).toISOString()
      const createUploadUrl = await context.blobsStorage.createUploadUrl(
        blob.digest,
        blob.size,
        expiresIn
      )
      if (createUploadUrl.error) {
        return createUploadUrl
      }

      const address = {
        url: createUploadUrl.ok.url.toString(),
        headers: createUploadUrl.ok.headers,
        expiresAt,
      }

      return {
        ok: {
          size,
          address,
        },
      }
    }
  )
}

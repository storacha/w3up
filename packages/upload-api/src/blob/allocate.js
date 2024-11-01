import * as Server from '@ucanto/server'
import * as W3sBlob from '@storacha/capabilities/web3.storage/blob'
import * as Digest from 'multiformats/hashes/digest'
import * as API from '../types.js'
import {
  BlobSizeOutsideOfSupportedRange,
  UnsupportedCapability,
} from './lib.js'

/**
 * @param {API.BlobServiceContext} context
 * @returns {API.ServiceMethod<API.W3sBlobAllocate, API.BlobAllocateSuccess, API.BlobAllocateFailure>}
 */
export const blobAllocateProvider = (context) =>
  Server.provide(W3sBlob.allocate, (input) => allocate(context, input))

/**
 * @param {API.BlobServiceContext} context
 * @param {API.ProviderInput<API.W3sBlobAllocate>} input
 */
export const allocate = async (context, { capability }) => {
  // Only service principal can perform an allocation
  if (capability.with !== context.id.did()) {
    return {
      error: new UnsupportedCapability({ capability }),
    }
  }

  const { blob, cause, space } = capability.nb
  const digest = Digest.decode(blob.digest)
  let { size } = blob

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

  // Verify blob is within the max upload size.
  if (capability.nb.blob.size > context.maxUploadSize) {
    // While blob may exceed current maxUploadSize limit it could be that limit
    // was higher in the past and user had this blob uploaded already in which
    // case we should not error.
    const exists = await context.allocationsStorage.exists(space, digest)
    if (exists.ok) {
      return { ok: { size: 0 } }
    } else {
      return {
        error: new BlobSizeOutsideOfSupportedRange(
          capability.nb.blob.size,
          context.maxUploadSize
        ),
      }
    }
  }

  // Allocate memory space for the blob. If memory for this blob is
  // already allocated, this allocates 0 bytes.
  const allocationInsert = await context.allocationsStorage.insert({
    space,
    blob,
    cause,
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

  // Check if we already have blob stored
  // TODO: this may depend on the region we want to allocate and will need
  // changes in the future.
  const hasBlobStore = await context.blobsStorage.has(digest)
  if (hasBlobStore.error) {
    return hasBlobStore
  }

  // If blob is stored, we can just allocate it to the space with the allocated size
  // TODO: this code path MAY lead to await failures - awaited http/put and blob/accept tasks
  // are supposed to fail if path does not exists.
  if (hasBlobStore.ok) {
    return {
      ok: { size },
    }
  }

  // Get presigned URL for the write target
  const expiresIn = 60 * 60 * 24 // 1 day
  const expiresAt = new Date(Date.now() + expiresIn).toISOString()
  const createUploadUrl = await context.blobsStorage.createUploadUrl(
    digest,
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

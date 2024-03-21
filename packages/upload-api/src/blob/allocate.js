import * as Server from '@ucanto/server'
import * as Blob from '@web3-storage/capabilities/blob'
import * as API from '../types.js'
import { BlobItemNotFound } from './lib.js'

/**
 * @param {API.BlobServiceContext} context
 * @returns {API.ServiceMethod<API.BlobAllocate, API.BlobAllocateSuccess, API.BlobAllocateFailure>}
 */
export function blobAllocateProvider(context) {
  return Server.provide(Blob.allocate, async ({ capability, invocation }) => {
    const { content, cause, space } = capability.nb

    // TODO: Read original invocation?

    // If blob is stored, we can just allocate it to the space
    const hasBlob = await context.blobStore.has(content)
    if (hasBlob.error) {
      return {
        error: new BlobItemNotFound(space)
      }
    }
    // Get presigned URL for the write target
    const createUploadUrl = await context.blobStore.createUploadUrl(link, size)
    if (createUploadUrl.error) {
      return {
        error: new Server.Failure('failed to provide presigned url')
      }
    }

    // Allocate in space, ignoring if already allocated
    const allocationInsert = await context.allocationStore.insert({
      space,
      content,
      size: 0, // TODO
      invocation: cause,
      issuer: invocation.issuer.did() // TODO
      // TODO: add write target
    })
    if (allocationInsert.error) {
      return {
        error: new Server.Failure('failed to allocate blob bytes')
      }
    }

    if (hasBlob) {
      return {
        ok: { size: 0 }
      }
    }

    return {
      ok: {
        size: 0,
        address: {
          url: createUploadUrl.ok.url.toString(),
          headers: createUploadUrl.ok.headers
        }
      }
    }
  })
}

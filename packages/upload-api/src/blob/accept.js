import * as Server from '@ucanto/server'
import * as W3sBlob from '@web3-storage/capabilities/web3.storage/blob'
import * as API from '../types.js'
import { BlobItemNotFound } from './lib.js'

/**
 * @param {API.W3ServiceContext} context
 * @returns {API.ServiceMethod<API.BlobAccept, API.BlobAcceptSuccess, API.BlobAcceptFailure>}
 */
export function blobAcceptProvider(context) {
  return Server.provide(W3sBlob.accept, async ({ capability }) => {
    const { blob } = capability.nb
    // If blob is not stored, we must fail
    const hasBlob = await context.blobsStorage.has(blob.content)
    if (hasBlob.error) {
      return {
        error: new BlobItemNotFound(),
      }
    }

    // TODO: Set bucket name
    // TODO: return content commitment

    return {
      error: new BlobItemNotFound(),
    }
  })
}

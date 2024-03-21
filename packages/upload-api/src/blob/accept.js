import * as Server from '@ucanto/server'
import * as Blob from '@web3-storage/capabilities/blob'
import * as API from '../types.js'
import { BlobItemNotFound } from './lib.js'

/**
 * @param {API.BlobServiceContext} context
 * @returns {API.ServiceMethod<API.BlobAccept, API.BlobAcceptSuccess, API.BlobAcceptFailure>}
 */
export function blobAcceptProvider(context) {
  return Server.provide(Blob.accept, async ({ capability }) => {

    return {
      ok: {
        claim: 'locationClaimLink'
      }
    }
  })
}

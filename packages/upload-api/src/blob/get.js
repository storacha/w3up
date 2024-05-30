import * as Server from '@ucanto/server'
import * as Blob from '@web3-storage/capabilities/blob'
import * as API from '../types.js'
import { BlobNotFound } from './lib.js'
import { decode } from 'multiformats/hashes/digest'

/**
 * @param {API.BlobServiceContext} context
 * @returns {API.ServiceMethod<API.BlobGet, API.BlobGetSuccess, API.BlobGetFailure>}
 */
export function blobGetProvider(context) {
  return Server.provide(Blob.get, async ({ capability }) => {
    const { digest } = capability.nb
    if (!digest) {
      return Server.fail('nb.digest must be set')
    }
    const space = Server.DID.parse(capability.with).did()
    const res = await context.allocationsStorage.get(space, digest)
    if (res.error && res.error.name === 'RecordNotFound') {
      return Server.error(new BlobNotFound(decode(digest)))
    }
    return res
  })
}

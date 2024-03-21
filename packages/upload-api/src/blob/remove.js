import * as Server from '@ucanto/server'
import * as Blob from '@web3-storage/capabilities/blob'
// import { base32 } from 'multiformats/bases/base32'
import * as API from '../types.js'
import { BlobItemNotFound } from './lib.js'

/**
 * @param {API.BlobServiceContext} context
 * @returns {API.ServiceMethod<API.BlobRemove, API.BlobRemoveSuccess, API.BlobRemoveFailure>}
 */
export function blobRemoveProvider(context) {
  return Server.provide(Blob.remove, async ({ capability }) => {
    const { content } = capability.nb
    const space = Server.DID.parse(capability.with).did()

    // const encodedMultihash = base32.encode(content)
    const res = await context.allocationStore.remove(space, content)
    if (res.error && res.error.name === 'RecordNotFound') {
      return Server.error(new BlobItemNotFound(space))
    }

    return res
  })
}

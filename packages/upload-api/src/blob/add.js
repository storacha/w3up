import * as Server from '@ucanto/server'
import { ed25519 } from '@ucanto/principal'
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
      const {
        id,
        allocationsStorage,
        maxUploadSize,
        getServiceConnection,
        tasksStorage,
      } = context
      const { blob } = capability.nb
      const space = /** @type {import('@ucanto/interface').DIDKey} */ (
        Server.DID.parse(capability.with).did()
      )

      if (blob.size > maxUploadSize) {
        return {
          error: new BlobItemSizeExceeded(maxUploadSize),
        }
      }

      const putSubject = await ed25519.derive(blob.content.slice(0, 32))
      const facts = Object.entries(putSubject.toArchive().keys).map(
        ([key, value]) => ({
          did: key,
          bytes: value,
        })
      )

      // Create effects for receipt
      const blobAllocate = Blob.allocate.invoke({
        issuer: id,
        audience: id,
        with: id.did(),
        nb: {
          blob,
          cause: invocation.link(),
          space,
        },
        expiration: Infinity,
      })
      const blobPut = Blob.put.invoke({
        issuer: putSubject,
        audience: putSubject,
        with: putSubject.toDIDKey(),
        nb: {
          content: blob.content,
        },
        facts,
        expiration: Infinity,
      })
      const blobAccept = Blob.accept.invoke({
        issuer: id,
        audience: id,
        with: id.toDIDKey(),
        nb: {
          blob,
          exp: Number.MAX_SAFE_INTEGER,
        },
        expiration: Infinity,
      })
      const [allocatefx, putfx, acceptfx] = await Promise.all([
        // 1. System attempts to allocate memory in user space for the blob.
        blobAllocate.delegate(),
        // 2. System requests user agent (or anyone really) to upload the content
        // corresponding to the blob
        // via HTTP PUT to given location.
        blobPut.delegate(),
        // 3. System will attempt to accept uploaded content that matches blob
        // multihash and size.
        blobAccept.delegate(),
      ])

      // store `http/put` invocation
      // TODO: store implementation
      // const archiveDelegationRes = await putfx.archive()
      // if (archiveDelegationRes.error) {
      //   return {
      //     error: archiveDelegationRes.error
      //   }
      // }
      const invocationPutRes = await tasksStorage.put(putfx)
      if (invocationPutRes.error) {
        return {
          error: invocationPutRes.error,
        }
      }

      // Schedule allocation if not allocated
      const allocatedExistsRes = await allocationsStorage.exists(
        space,
        blob.content
      )
      if (!allocatedExistsRes.ok) {
        // Execute allocate invocation
        const allocateRes = await blobAllocate.execute(getServiceConnection())
        if (allocateRes.out.error) {
          return {
            error: allocateRes.out.error,
          }
        }
      }

      /** @type {API.OkBuilder<API.BlobAddSuccess, API.BlobAddFailure>} */
      const result = Server.ok({
        claim: {
          'await/ok': acceptfx.link(),
        },
      })
      // TODO: not pass links, but delegation
      return result
        .fork(allocatefx.link())
        .fork(putfx.link())
        .join(acceptfx.link())
    },
  })
}

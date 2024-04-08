import * as Server from '@ucanto/server'
import { Message } from '@ucanto/core'
import { ed25519 } from '@ucanto/principal'
import { CAR } from '@ucanto/transport'
import * as Blob from '@web3-storage/capabilities/blob'
import * as W3sBlob from '@web3-storage/capabilities/web3.storage/blob'
import * as HTTP from '@web3-storage/capabilities/http'
import * as UCAN from '@web3-storage/capabilities/ucan'
import * as API from '../types.js'

import { BlobExceedsSizeLimit } from './lib.js'

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

      // Verify blob is within accept size
      if (blob.size > maxUploadSize) {
        return {
          error: new BlobExceedsSizeLimit(maxUploadSize),
        }
      }

      // We derive principal from the content multihash to be an audience
      // of the `http/put` invocation. That way anyone with blob content
      // could perform the invocation and issue receipt by deriving same
      // principal
      const blobProvider = await ed25519.derive(blob.content.slice(0, 32))
      const facts = [
        {
          keys: blobProvider.toArchive(),
        },
      ]

      // Create web3.storage/blob/* invocations
      const blobAllocate = W3sBlob.allocate.invoke({
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
      const blobAccept = W3sBlob.accept.invoke({
        issuer: id,
        audience: id,
        with: id.toDIDKey(),
        nb: {
          blob,
          exp: Number.MAX_SAFE_INTEGER,
        },
        expiration: Infinity,
      })
      const [allocatefx, acceptfx] = await Promise.all([
        blobAllocate.delegate(),
        blobAccept.delegate(),
      ])

      // Get receipt for `blob/allocate` if available, or schedule invocation if not
      const allocatedGetRes = await allocationsStorage.get(space, blob.content)
      let blobAllocateReceipt
      /** @type {API.BlobAddress | undefined} */
      let blobAllocateOutAddress
      // If already allocated, just get the allocate receipt
      // and the addresses if still pending to receive blob
      if (allocatedGetRes.ok) {
        const receiptGet = await context.receiptsStorage.get(allocatefx.link())
        if (receiptGet.error) {
          return receiptGet
        }
        blobAllocateReceipt = receiptGet.ok

        // Check if despite allocated, the blob is still not stored
        const blobHasRes = await context.blobsStorage.has(blob.content)
        if (blobHasRes.error) {
          return blobHasRes
        // If still not stored, keep the allocate address to signal to the client
        // that bytes MUST be sent through the `http/put` effect
        } else if (!blobHasRes.ok) {
          // @ts-expect-error receipt type is unknown
          blobAllocateOutAddress = blobAllocateReceipt.out.ok.address
        }
      }
      // if not already allocated, schedule `blob/allocate`
      else {
        // Execute allocate invocation
        const allocateRes = await blobAllocate.execute(getServiceConnection())
        if (allocateRes.out.error) {
          return {
            error: allocateRes.out.error,
          }
        }
        // If this is a new allocation, `http/put` effect should be returned with address
        blobAllocateOutAddress = allocateRes.out.ok.address
        blobAllocateReceipt = allocateRes
      }

      // Create `blob/allocate` receipt invocation to inline as effect
      const message = await Message.build({ receipts: [blobAllocateReceipt] })
      const messageCar = await CAR.outbound.encode(message)
      const bytes = new Uint8Array(messageCar.body)
      const messageLink = await CAR.codec.link(bytes)

      const allocateUcanConcludefx = await UCAN.conclude
        .invoke({
          issuer: id,
          audience: id,
          with: id.toDIDKey(),
          nb: {
            message: messageLink,
          },
          expiration: Infinity,
        })
        .delegate()
      allocateUcanConcludefx.attach({
        bytes,
        cid: messageLink,
      })

      // Create result object
      /** @type {API.OkBuilder<API.BlobAddSuccess, API.BlobAddFailure>} */
      const result = Server.ok({
        location: {
          'ucan/await': ['.out.ok.claim', acceptfx.link()],
        },
      })

      // In case blob allocate provided an address to write
      // the blob is still not stored
      if (blobAllocateOutAddress) {
        const blobPut = HTTP.put.invoke({
          issuer: blobProvider,
          audience: blobProvider,
          with: blobProvider.toDIDKey(),
          nb: {
            body: blob,
            url: blobAllocateOutAddress.url,
            headers: blobAllocateOutAddress.headers
          },
          facts,
          expiration: Infinity,
        })

        const putfx = await blobPut.delegate()

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

        return (
          result
            // 1. System attempts to allocate memory in user space for the blob.
            .fork(allocatefx)
            .fork(allocateUcanConcludefx)
            // 2. System requests user agent (or anyone really) to upload the content
            // corresponding to the blob
            // via HTTP PUT to given location.
            .fork(putfx)
            // 3. System will attempt to accept uploaded content that matches blob
            // multihash and size.
            .join(acceptfx)
        )
      }

      // Add allocate receipt if allocate was executed
      if (allocateUcanConcludefx) {
        return (
          result
            // 1. System attempts to allocate memory in user space for the blob.
            .fork(allocatefx)
            .fork(allocateUcanConcludefx)
            // 3. System will attempt to accept uploaded content that matches blob
            // multihash and size.
            .join(acceptfx)
        )
      }

      // Blob was already allocated and is already stored in the system
      return (
        result
          // 1. System allocated memory in user space for the blob.
          .fork(allocatefx)
          .fork(allocateUcanConcludefx)
          // 3. System will attempt to accept uploaded content that matches blob
          // multihash and size.
          .join(acceptfx)
      )
    },
  })
}

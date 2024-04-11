import * as API from '../types.js'
import { provide } from '@ucanto/server'
import { Receipt } from '@ucanto/core'
import * as W3sBlob from '@web3-storage/capabilities/web3.storage/blob'
import * as HTTP from '@web3-storage/capabilities/http'
import { conclude } from '@web3-storage/capabilities/ucan'
import { equals } from 'uint8arrays/equals'

/**
 * @param {API.ConcludeServiceContext} context
 * @returns {API.ServiceMethod<API.UCANConclude, API.UCANConcludeSuccess, API.UCANConcludeFailure>}
 */
export const ucanConcludeProvider = ({
  id,
  receiptsStorage,
  tasksStorage,
  tasksScheduler,
}) =>
  provide(conclude, async ({ invocation }) => {
    const receipt = getConcludeReceipt(invocation)

    // Verify invocation exists failing with ReceiptInvocationNotFound
    const ranInvocation = receipt.ran
    const httpPutTaskGetRes = await tasksStorage.get(ranInvocation.link())
    if (httpPutTaskGetRes.error) {
      return httpPutTaskGetRes
    }

    // Store receipt
    const receiptPutRes = await receiptsStorage.put(receipt)
    if (receiptPutRes.error) {
      return {
        error: receiptPutRes.error,
      }
    }

    // THIS IS A TEMPORARY HACK
    // Schedule `blob/accept` if there is a `http/put` capabilities
    // inside the invocation that this receipt comes from
    const scheduleRes = await Promise.all(
      httpPutTaskGetRes.ok.capabilities
        // Go through invocation tasks and get all `http/put`
        .filter((cap) => cap.can === HTTP.put.can)
        // @ts-expect-error body exists in `http/put` but unknown type here
        .map(async (/** @type {API.HTTPPut} */ cap) => {
          // Get triggering task (blob/allocate) by checking blocking task from `url`
          /** @type {API.UnknownLink} */
          // @ts-expect-error ts does not know how to get this
          const blobAllocateTaskCid = cap.nb.url['ucan/await'][1]
          const blobAllocateTaskGet = await tasksStorage.get(
            blobAllocateTaskCid
          )
          if (blobAllocateTaskGet.error) {
            return blobAllocateTaskGet
          }

          /** @type {API.BlobAllocate} */
          // @ts-expect-error ts does not know how to get this
          const allocateCapability = blobAllocateTaskGet.ok.capabilities.find(
            // @ts-expect-error ts does not know how to get this
            (/** @type {API.BlobAllocate} */ allocateCap) =>
              equals(allocateCap.nb.blob.digest, cap.nb.body.digest) &&
              allocateCap.can === W3sBlob.allocate.can
          )

          const blobAccept = await W3sBlob.accept
            .invoke({
              issuer: id,
              audience: id,
              with: id.toDIDKey(),
              nb: {
                blob: cap.nb.body,
                space: allocateCapability.nb.space,
                _put: {
                  'ucan/await': ['.out.ok', ranInvocation.link()],
                },
              },
              expiration: Infinity,
            })
            .delegate()

          return tasksScheduler.schedule(blobAccept)
        })
    )

    const scheduleErrors = scheduleRes.filter((res) => res.error)
    if (scheduleErrors.length && scheduleErrors[0].error) {
      return {
        error: scheduleErrors[0].error,
      }
    }

    return {
      ok: { time: Date.now() },
    }
  })

/**
 * @param {import('@ucanto/interface').Invocation} concludeFx
 */
export function getConcludeReceipt(concludeFx) {
  const receiptBlocks = new Map()
  for (const block of concludeFx.iterateIPLDBlocks()) {
    receiptBlocks.set(`${block.cid}`, block)
  }
  return Receipt.view({
    // @ts-expect-error object of type unknown
    root: concludeFx.capabilities[0].nb.receipt,
    blocks: receiptBlocks,
  })
}

/**
 * @param {API.Signer} id
 * @param {API.Verifier} serviceDid
 * @param {API.Receipt} receipt
 */
export function createConcludeInvocation(id, serviceDid, receipt) {
  const receiptBlocks = []
  for (const block of receipt.iterateIPLDBlocks()) {
    receiptBlocks.push(block)
  }
  const concludeAllocatefx = conclude.invoke({
    issuer: id,
    audience: serviceDid,
    with: id.toDIDKey(),
    nb: {
      receipt: receipt.link(),
    },
    expiration: Infinity,
    facts: [
      {
        ...receiptBlocks.map((b) => b.cid),
      },
    ],
  })
  for (const block of receipt.iterateIPLDBlocks()) {
    concludeAllocatefx.attach(block)
  }

  return concludeAllocatefx
}

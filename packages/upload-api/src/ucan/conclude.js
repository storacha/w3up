import { provide } from '@ucanto/server'
import { Receipt } from '@ucanto/core'
import * as W3sBlob from '@web3-storage/capabilities/web3.storage/blob'
import * as HTTP from '@web3-storage/capabilities/http'
import { conclude } from '@web3-storage/capabilities/ucan'
import { DecodeBlockOperationFailed } from '../errors.js'
import * as API from '../types.js'

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
    // Schedule `blob/accept` if there is a `http/put` capability
    const scheduleRes = await Promise.all(
      httpPutTaskGetRes.ok.capabilities
        .filter((cap) => cap.can === HTTP.put.can)
        .map(async (cap) => {
          const blobAccept = await W3sBlob.accept
            .invoke({
              issuer: id,
              audience: id,
              with: id.toDIDKey(),
              nb: {
                // @ts-expect-error body exists in `http/put` but unknown type here
                blob: cap.nb.body,
                exp: Number.MAX_SAFE_INTEGER,
                // TODO: corect space
                space: id.toDIDKey(),
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
 * @param {import('multiformats').UnknownLink} cid
 * @param {IterableIterator<import('@ucanto/interface').Block<unknown, number, number, 1>>} blocks
 * @returns {Promise<import('@ucanto/interface').Result<Uint8Array, DecodeBlockOperationFailed>>}
 */
export const findBlock = async (cid, blocks) => {
  let bytes
  for (const b of blocks) {
    if (b.cid.equals(cid)) {
      bytes = b.bytes
    }
  }
  if (!bytes) {
    return {
      error: new DecodeBlockOperationFailed(`missing block: ${cid}`),
    }
  }
  return {
    ok: bytes,
  }
}

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

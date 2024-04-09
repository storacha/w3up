import { provide } from '@ucanto/server'
import { Message } from '@ucanto/core'
import { CAR } from '@ucanto/transport'
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
  provide(conclude, async ({ capability, invocation }) => {
    const getBlockRes = await findBlock(
      capability.nb.receipt,
      invocation.iterateIPLDBlocks()
    )
    if (getBlockRes.error) {
      return getBlockRes
    }
    const messageCar = CAR.codec.decode(getBlockRes.ok)
    const message = Message.view({
      root: messageCar.roots[0].cid,
      store: messageCar.blocks,
    })

    // TODO: check number of receipts
    const receiptKey = Array.from(message.receipts.keys())[0]
    const receipt = message.receipts.get(receiptKey)

    if (!receipt) {
      throw new Error('receipt should exist')
    }

    // TODO: Verify invocation exists failing with ReceiptInvocationNotFound

    // Store receipt
    const receiptPutRes = await receiptsStorage.put(receipt)
    if (receiptPutRes.error) {
      return {
        error: receiptPutRes.error,
      }
    }

    // THIS IS A TEMPORARY HACK
    // Schedule `blob/accept`
    const ranInvocation = receipt.ran

    // Get invocation
    const httpPutTaskGetRes = await tasksStorage.get(ranInvocation.link())
    if (httpPutTaskGetRes.error) {
      return httpPutTaskGetRes
    }

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
                // TOOD: space
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

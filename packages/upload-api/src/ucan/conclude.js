import { provide } from '@ucanto/server'
import { Message } from '@ucanto/core'
import { CAR } from '@ucanto/transport'
import * as Blob from '@web3-storage/capabilities/blob'
import { conclude } from '@web3-storage/capabilities/ucan'
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
  provide(conclude, async ({ capability }) => {
    const messageCar = CAR.codec.decode(capability.nb.bytes)
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

    // TODO: This actually needs the accept task!!!!
    // Get invocation
    const httpPutTaskGetRes = await tasksStorage.get(ranInvocation.link())
    if (httpPutTaskGetRes.error) {
      return httpPutTaskGetRes
    }

    // Schedule `blob/accept` if there is a `http/put` capability
    const scheduleRes = await Promise.all(
      httpPutTaskGetRes.ok.capabilities
        .filter((cap) => cap.can === Blob.put.can)
        .map(async (cap) => {
          const blobAccept = await Blob.accept.invoke({
            issuer: id,
            audience: id,
            with: id.toDIDKey(),
            nb: {
              // @ts-expect-error blob exists in put
              blob: cap.nb.blob,
              exp: Number.MAX_SAFE_INTEGER,
            },
            expiration: Infinity,
          }).delegate()
          
          return tasksScheduler.schedule(blobAccept)
        })
    )
    const scheduleErrors = scheduleRes.filter(res => res.error)
    if (scheduleErrors.length && scheduleErrors[0].error) {
      return {
        error: scheduleErrors[0].error
      }
    }

    return {
      ok: { time: Date.now() },
    }
  })

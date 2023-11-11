import { provide } from '@ucanto/server'
import { Message } from '@ucanto/core'
import { CAR } from '@ucanto/transport'
import { receipt } from '@web3-storage/capabilities/ucan'
import * as API from '../types.js'

/**
 * @param {API.UcanReceiptServiceContext} context
 * @returns {API.ServiceMethod<API.UCANReceipt, API.UCANReceiptSuccess, API.UCANReceiptFailure>}
 */
export const ucanReceiptProvider = ({ receiptsStorage }) =>
  provide(receipt, async ({ capability }) => {
    const { task, follow } = capability.nb

    // Get requested receipt
    const taskReceiptGet = await receiptsStorage.get(task)
    if (taskReceiptGet.error) {
      return {
        error: taskReceiptGet.error,
      }
    }

    /** @type {import('@ucanto/interface').Receipt[]} */
    let receipts
    if (follow) {
      receipts = await followReceipt(taskReceiptGet.ok, receiptsStorage)
    } else {
      receipts = [taskReceiptGet.ok]
    }

    // Encode receipts as an `ucanto` message so that they can be decoded on the other end
    // @ts-ignore
    const message = await Message.build({ receipts })
    const request = await CAR.outbound.encode(message)

    return {
      ok: request,
    }
  })

/**
 * Follows given receipt through its effects as a recursive function.
 * Ends when either there are no forks/join effects, or the looked ones are not yet available.
 * Given receipts may still not be available in the requested receipt chain, failures are ignored.
 *
 * @param {import('@ucanto/interface').Receipt} receipt
 * @param {API.ReceiptsStorage} receiptsStorage
 * @returns {Promise<import('@ucanto/interface').Receipt[]>}
 */
const followReceipt = async (receipt, receiptsStorage) => {
  let joinReceipt
  if (receipt.fx.join) {
    const taskReceiptGet = await receiptsStorage.get(receipt.fx.join)
    // if not available, we just return
    if (taskReceiptGet.ok) {
      joinReceipt = taskReceiptGet.ok
    }
  }

  const forkReceiptsGet = await Promise.all(
    receipt.fx.fork.map((f) => receiptsStorage.get(f))
  )
  // Skip the ones not found or errored
  const forkReceipts = /** @type {import('@ucanto/interface').Receipt[]} */ (
    forkReceiptsGet.filter((g) => g.ok).map((g) => g.ok)
  )

  const receipts = [receipt]
  // add join receipts
  if (joinReceipt) {
    receipts.push(...(await followReceipt(joinReceipt, receiptsStorage)))
  }
  // add for receipts
  if (forkReceipts.length) {
    const forkFollow = await Promise.all(
      forkReceipts.map((f) => followReceipt(f, receiptsStorage))
    )

    for (const receiptsToAdd of forkFollow) {
      receipts.push(...receiptsToAdd)
    }
  }

  return receipts
}

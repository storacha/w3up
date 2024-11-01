import * as API from '../types.js'
import { provide } from '@ucanto/server'
import { Receipt } from '@ucanto/core'
import { conclude } from '@storacha/capabilities/ucan'
import * as BlobAccept from '../blob/accept.js'

/**
 * @param {API.ConcludeServiceContext} context
 * @returns {API.ServiceMethod<API.UCANConclude, API.UCANConcludeSuccess, API.UCANConcludeFailure>}
 */
export const ucanConcludeProvider = (context) =>
  provide(conclude, async ({ invocation }) => {
    // 🚧 THIS IS A TEMPORARY HACK 🚧
    // When we receive a receipt for the invocation we want to resume the tasks
    // that were awaiting in the background. In the future task scheduler is
    // expected to handle coordination of tasks and their dependencies. In the
    // meantime we poll `blob/allocate` tasks that were awaiting for the
    // `http/put` receipt.
    const result = await BlobAccept.poll(
      context,
      getConcludeReceipt(invocation)
    )

    // If polling failed we propagate the error to the caller, while this is
    // not ideal it's a better option than silently failing. We do not expect
    // this to happen, however, if it does this will propagate to the user and
    // they will be able to complain about it.
    if (result.error) {
      return result
    } else {
      return { ok: { time: Date.now() } }
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
  const receiptCids = []
  for (const block of receipt.iterateIPLDBlocks()) {
    receiptBlocks.push(block)
    receiptCids.push(block.cid)
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
        ...receiptCids,
      },
    ],
  })
  for (const block of receiptBlocks) {
    concludeAllocatefx.attach(block)
  }

  return concludeAllocatefx
}

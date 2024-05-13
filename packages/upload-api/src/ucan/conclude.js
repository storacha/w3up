import * as API from '../types.js'
import { provide } from '@ucanto/server'
import { Receipt, Message } from '@ucanto/core'
import { conclude } from '@web3-storage/capabilities/ucan'
import * as BlobAccept from '../blob/accept.js'

/**
 * @param {API.ConcludeServiceContext} context
 * @returns {API.ServiceMethod<API.UCANConclude, API.UCANConcludeSuccess, API.UCANConcludeFailure>}
 */
export const ucanConcludeProvider = (context) =>
  provide(conclude, async ({ invocation }) => {
    const receipt = getConcludeReceipt(invocation)

    // First of all that we create a message and save it to agent store, that
    // way even if invocation occurs later we will have receipt already.
    const message = await Message.build({ receipts: [receipt] })
    const save = await context.agentStore.messages.write(message)
    if (save.error) {
      return save
    }

    // If palling errors we propagate errors that is because referenced
    // blob/allocate can not be found and we want to make sure that such
    // corresponding http/put receipt does land without any notice.
    const result = await BlobAccept.poll(context, receipt)
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

import { provide } from '@ucanto/server'
import { Message } from '@ucanto/core'
import { CAR } from '@ucanto/transport'
import { conclude } from '@web3-storage/capabilities/ucan'
import * as API from '../types.js'

/**
 * @param {API.ConcludeServiceContext} context
 * @returns {API.ServiceMethod<API.UCANConclude, API.UCANConcludeSuccess, API.UCANConcludeFailure>}
 */
export const ucanConcludeProvider = ({ receiptsStorage }) =>
  provide(conclude, async ({ capability }) => {
    const messageCar = CAR.codec.decode(capability.nb.bytes)
    const message = Message.view({ root: messageCar.roots[0].cid, store: messageCar.blocks })

    // TODO: check number of receipts
    const receiptKey = Array.from(message.receipts.keys())[0]
    const receipt = message.receipts.get(receiptKey)

    if (!receipt) {
      throw new Error('receipt should exist')
    }
    
    const receiptPutRes = await receiptsStorage.put(receipt)
    if (receiptPutRes.error) {
      return {
        error: receiptPutRes.error
      }
    }

    // TODO: Schedule accept (temporary simple hack)

    return {
      ok: { time: Date.now() },
    }
  })

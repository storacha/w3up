import * as API from '../../src/types.js'

import * as W3sBlobCapabilities from '@web3-storage/capabilities/web3.storage/blob'
import * as HTTPCapabilities from '@web3-storage/capabilities/http'
import * as UCAN from '@web3-storage/capabilities/ucan'

import {
  getConcludeReceipt,
} from '../../src/ucan/conclude.js'

/**
 * @param {API.Receipt} receipt 
 */
export function parseBlobAddReceiptNext (receipt) {
  // Get invocations next
  /**
   * @type {import('@ucanto/interface').Invocation[]}
   **/
  // @ts-expect-error read only effect
  const forkInvocations = receipt.fx.fork
  const allocatefx = forkInvocations.find(
    (fork) => fork.capabilities[0].can === W3sBlobCapabilities.allocate.can
  )
  const concludefxs = forkInvocations.filter(
    (fork) => fork.capabilities[0].can === UCAN.conclude.can
  )
  const putfx = forkInvocations.find(
    (fork) => fork.capabilities[0].can === HTTPCapabilities.put.can
  )
  const acceptfx = receipt.fx.join
  if (!allocatefx || !concludefxs.length || !putfx || !acceptfx) {
    throw new Error('mandatory effects not received')
  }

  // Decode receipts available
  const nextReceipts = concludefxs.map(fx => getConcludeReceipt(fx))
  /** @type {API.Receipt<API.BlobAllocateSuccess, API.BlobAllocateFailure> | undefined} */
  // @ts-expect-error types unknown for next
  const allocateReceipt = nextReceipts.find(receipt => receipt.ran.link().equals(allocatefx.cid))
  /** @type {API.Receipt<{}, API.Failure> | undefined} */
  // @ts-expect-error types unknown for next
  const putReceipt = nextReceipts.find(receipt => receipt.ran.link().equals(putfx.cid))
  /** @type {API.Receipt<API.BlobAcceptSuccess, API.BlobAcceptFailure> | undefined} */
  // @ts-expect-error types unknown for next
  const acceptReceipt = nextReceipts.find(receipt => receipt.ran.link().equals(acceptfx.link()))

  if (!allocateReceipt) {
    throw new Error('mandatory effects not received')
  }

  return {
    allocatefx,
    allocateReceipt,
    concludefxs,
    putfx,
    putReceipt,
    acceptfx,
    acceptReceipt
  }
}

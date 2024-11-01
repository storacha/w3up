import * as API from '../../src/types.js'
import { ed25519 } from '@ucanto/principal'
import { Delegation, Receipt } from '@ucanto/core'
import * as W3sBlobCapabilities from '@storacha/capabilities/web3.storage/blob'
import * as BlobCapabilities from '@storacha/capabilities/blob'
import * as HTTPCapabilities from '@storacha/capabilities/http'
import * as UCAN from '@storacha/capabilities/ucan'
import {
  createConcludeInvocation,
  getConcludeReceipt,
} from '../../src/ucan/conclude.js'
import * as Result from './result.js'

/**
 * @param {API.Receipt} receipt
 */
export function parseBlobAddReceiptNext(receipt) {
  // Get invocations next
  /**
   * @type {import('@ucanto/interface').Invocation[]}
   */
  // @ts-expect-error read only effect
  const forkInvocations = receipt.fx.fork
  const allocateTask = forkInvocations.find(
    (fork) => fork.capabilities[0].can === W3sBlobCapabilities.allocate.can
  )
  const concludefxs = forkInvocations.filter(
    (fork) => fork.capabilities[0].can === UCAN.conclude.can
  )
  const putTask = forkInvocations.find(
    (fork) => fork.capabilities[0].can === HTTPCapabilities.put.can
  )
  const acceptTask = forkInvocations.find(
    (fork) => fork.capabilities[0].can === W3sBlobCapabilities.accept.can
  )

  if (!allocateTask || !concludefxs.length || !putTask || !acceptTask) {
    throw new Error('mandatory effects not received')
  }

  // Decode receipts available
  const nextReceipts = concludefxs.map((fx) => getConcludeReceipt(fx))
  /** @type {API.Receipt<API.BlobAllocateSuccess, API.BlobAllocateFailure> | undefined} */
  // @ts-expect-error types unknown for next
  const allocateReceipt = nextReceipts.find((receipt) =>
    receipt.ran.link().equals(allocateTask.cid)
  )
  /** @type {API.Receipt<{}, API.Failure> | undefined} */
  // @ts-expect-error types unknown for next
  const putReceipt = nextReceipts.find((receipt) =>
    receipt.ran.link().equals(putTask.cid)
  )
  /** @type {API.Receipt<API.BlobAcceptSuccess, API.BlobAcceptFailure> | undefined} */
  // @ts-expect-error types unknown for next
  const acceptReceipt = nextReceipts.find((receipt) =>
    receipt.ran.link().equals(acceptTask.link())
  )

  if (!allocateReceipt) {
    throw new Error('mandatory effects not received')
  }

  let acceptSite = {}
  if (acceptReceipt?.out.ok?.site) {
    const blocks = new Map(
      [...receipt.iterateIPLDBlocks()].map((block) => [`${block.cid}`, block])
    )

    acceptSite.site = Delegation.view({
      root: /** @type {API.UCANLink} */ (acceptReceipt.out.ok.site),
      blocks,
    })
  }

  return {
    allocate: {
      task: allocateTask,
      receipt: allocateReceipt,
    },
    put: {
      task: putTask,
      receipt: putReceipt,
    },
    accept: {
      task: acceptTask,
      receipt: acceptReceipt,
      ...acceptSite,
    },
  }
}

/**
 * @param {API.UcantoServerTestContext} context
 * @param {object} config
 * @param {API.ConnectionView<API.Service>} config.connection
 * @param {API.Signer} config.issuer
 * @param {API.Verifier} config.audience
 * @param {API.SpaceDID} config.with
 * @param {API.Delegation[]} config.proofs
 * @param {{ cid: API.UnknownLink, bytes: Uint8Array }} content
 */
export const uploadBlob = async (
  context,
  { connection, issuer, audience, with: resource, proofs },
  content
) => {
  const blobAdd = BlobCapabilities.add.invoke({
    issuer,
    audience,
    with: resource,
    nb: {
      blob: {
        digest: content.cid.multihash.bytes,
        size: content.bytes.length,
      },
    },
    proofs,
  })

  const receipt = await blobAdd.execute(connection)
  Result.try(receipt.out)

  const nextTasks = parseBlobAddReceiptNext(receipt)

  const { address } = Result.unwrap(nextTasks.allocate.receipt.out)
  if (address) {
    const { status } = await fetch(address.url, {
      method: 'PUT',
      mode: 'cors',
      body: content.bytes,
      headers: address.headers,
    })
    if (status !== 200) throw new Error(`unexpected status: ${status}`)
  }

  // Simulate server storing allocation receipt and task

  // Invoke `conclude` with `http/put` receipt
  const derivedSigner = ed25519.from(
    /** @type {API.SignerArchive<API.DID, typeof ed25519.signatureCode>} */
    (nextTasks.put.task.facts[0]['keys'])
  )
  const httpPut = HTTPCapabilities.put.invoke({
    issuer: derivedSigner,
    audience: derivedSigner,
    with: derivedSigner.toDIDKey(),
    nb: {
      body: {
        digest: content.cid.multihash.bytes,
        size: content.bytes.length,
      },
      url: {
        'ucan/await': ['.out.ok.address.url', nextTasks.allocate.task.cid],
      },
      headers: {
        'ucan/await': ['.out.ok.address.headers', nextTasks.allocate.task.cid],
      },
    },
    facts: nextTasks.put.task.facts,
    expiration: Infinity,
  })

  const httpPutDelegation = await httpPut.delegate()
  const httpPutReceipt = await Receipt.issue({
    issuer: derivedSigner,
    ran: httpPutDelegation.cid,
    result: { ok: {} },
  })
  const httpPutConcludeInvocation = createConcludeInvocation(
    issuer,
    audience,
    httpPutReceipt
  )
  const ucanConclude = await httpPutConcludeInvocation.execute(connection)
  Result.try(ucanConclude.out)
}

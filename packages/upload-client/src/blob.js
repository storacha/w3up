import { ed25519 } from '@ucanto/principal'
import { conclude } from '@web3-storage/capabilities/ucan'
import * as UCAN from '@web3-storage/capabilities/ucan'
import { CAR } from '@ucanto/transport'
import { Receipt } from '@ucanto/core'
import * as W3sBlobCapabilities from '@web3-storage/capabilities/web3.storage/blob'
import * as BlobCapabilities from '@web3-storage/capabilities/blob'
import * as HTTPCapabilities from '@web3-storage/capabilities/http'
import { SpaceDID } from '@web3-storage/capabilities/utils'
import retry from 'p-retry'
import { servicePrincipal, connection } from './service.js'
import { REQUEST_RETRIES } from './constants.js'

// FIXME this code has been copied over from upload-api
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

// FIXME this code has been copied over from upload-api
/**
 * @param {import('@ucanto/interface').Receipt} receipt
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
  const acceptTask = receipt.fx.join
  if (!allocateTask || !concludefxs.length || !putTask || !acceptTask) {
    throw new Error('mandatory effects not received')
  }

  // Decode receipts available
  const nextReceipts = concludefxs.map((fx) => getConcludeReceipt(fx))
  /** @type {import('@ucanto/interface').Receipt<import('./types.js').BlobAllocateSuccess, import('./types.js').BlobAllocateFailure> | undefined} */
  // @ts-expect-error types unknown for next
  const allocateReceipt = nextReceipts.find((receipt) =>
    receipt.ran.link().equals(allocateTask.cid)
  )
  /** @type {import('@ucanto/interface').Receipt<{}, import('@ucanto/interface').Failure> | undefined} */
  // @ts-expect-error types unknown for next
  const putReceipt = nextReceipts.find((receipt) =>
    receipt.ran.link().equals(putTask.cid)
  )
  /** @type {import('@ucanto/interface').Receipt<import('./types.js').BlobAcceptSuccess, import('./types.js').BlobAcceptFailure> | undefined} */
  // @ts-expect-error types unknown for next
  const acceptReceipt = nextReceipts.find((receipt) =>
    receipt.ran.link().equals(acceptTask.link())
  )

  if (!allocateReceipt) {
    throw new Error('mandatory effects not received')
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
    },
  }
}

// FIXME this code has been copied over from upload-api
/**
 * @param {import('@ucanto/interface').Signer} id
 * @param {import('@ucanto/interface').Verifier} serviceDid
 * @param {import('@ucanto/interface').Receipt} receipt
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

/**
 * Store a DAG encoded as a CAR file. The issuer needs the `blob/add`
 * delegated capability.
 *
 * Required delegated capability proofs: `blob/add`
 *
 * @param {import('./types.js').InvocationConfig} conf Configuration
 * for the UCAN invocation. An object with `issuer`, `with` and `proofs`.
 *
 * The `issuer` is the signing authority that is issuing the UCAN
 * invocation(s). It is typically the user _agent_.
 *
 * The `with` is the resource the invocation applies to. It is typically the
 * DID of a space.
 *
 * The `proofs` are a set of capability delegations that prove the issuer
 * has the capability to perform the action.
 *
 * The issuer needs the `blob/add` delegated capability.
 * @param {Blob|Uint8Array} car CAR file data.
 * @param {import('./types.js').RequestOptions} [options]
 * @returns {Promise<import('./types.js').CARLink>}
 */
export async function add(
  { issuer, with: resource, proofs, audience },
  car,
  options = {}
) {
  const bytes =
    car instanceof Uint8Array ? car : new Uint8Array(await car.arrayBuffer())
  const link = await CAR.codec.link(bytes)
  const digest = link.bytes
  const size = bytes.length
  const conn = options.connection ?? connection

  const result = await retry(
    async () => {
      return await BlobCapabilities.add
        .invoke({
          issuer,
          audience: audience ?? servicePrincipal,
          with: SpaceDID.from(resource),
          nb: {
            blob: {
              digest,
              size,
            }
          },
          proofs,
        })
        .execute(conn)
    },
    {
      onFailedAttempt: console.warn,
      retries: options.retries ?? REQUEST_RETRIES,
    }
  )

  if (!result.out.ok) {
    throw new Error(`failed ${BlobCapabilities.add.can} invocation`, {
      cause: result.out.error,
    })
  }

  const nextTasks = parseBlobAddReceiptNext(result)

  const { receipt } = nextTasks.allocate
  if (!receipt.out.ok) {
    throw new Error(`failed ${BlobCapabilities.add.can} invocation`, {
      cause: receipt.out.error,
    })
  }

  const { address } = receipt.out.ok
  if (address) {
    const { status } = await fetch(address.url, {
      method: 'PUT',
      mode: 'cors',
      body: bytes,
      headers: address.headers,
    })
    if (status !== 200) throw new Error(`unexpected status: ${status}`)
  }

  // Invoke `conclude` with `http/put` receipt
  const derivedSigner = ed25519.from(
    /** @type {import('@ucanto/interface').SignerArchive<import('@ucanto/interface').DID, typeof ed25519.signatureCode>} */
    (nextTasks.put.task.facts[0]['keys'])
  )
  const httpPut = HTTPCapabilities.put.invoke({
    issuer: derivedSigner,
    audience: derivedSigner,
    with: derivedSigner.toDIDKey(),
    nb: {
      body: {
        digest,
        size,
      },
      url: {
        'ucan/await': ['.out.ok.address.url', nextTasks.allocate.task.cid],
      },
      headers: {
        'ucan/await': [
          '.out.ok.address.headers',
          nextTasks.allocate.task.cid,
        ],
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
  // @ts-expect-error object of type unknown
  const httpPutConcludeInvocation = createConcludeInvocation(issuer, audience, httpPutReceipt)
  const ucanConclude = await httpPutConcludeInvocation.execute(conn)
  console.log("FOO", ucanConclude.out)

  if (!ucanConclude.out.ok) {
    throw new Error(`failed ${BlobCapabilities.add.can} invocation`, {
      cause: result.out.error,
    })
  }

  return link
}

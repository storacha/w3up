import * as Server from '@ucanto/server'
import { Receipt } from '@ucanto/core'
import { ed25519 } from '@ucanto/principal'
import * as Blob from '@web3-storage/capabilities/blob'
import * as W3sBlob from '@web3-storage/capabilities/web3.storage/blob'
import * as HTTP from '@web3-storage/capabilities/http'
import * as API from '../types.js'

import { createConcludeInvocation } from '../ucan/conclude.js'
import { AwaitError } from './lib.js'

/**
 * Derives did:key principal from (blob) multihash that can be used to
 * sign ucan invocations/receipts for the the subject (blob) multihash.
 *
 * @param {API.Multihash} multihash
 */
export const deriveDID = (multihash) => ed25519.derive(multihash.subarray(-32))

/**
 * @param {API.Receipt} receipt
 * @param {API.Signer} issuer
 * @param {API.Verifier} audience
 */
const conclude = (receipt, issuer, audience = issuer) =>
  createConcludeInvocation(issuer, audience, receipt).delegate()

/**
 * @param {API.BlobServiceContext} context
 * @returns {API.ServiceMethod<API.BlobAdd, API.BlobAddSuccess, API.BlobAddFailure>}
 */
export function blobAddProvider(context) {
  return Server.provideAdvanced({
    capability: Blob.add,
    handler: async ({ capability, invocation }) => {
      const { with: space, nb } = capability
      const { blob } = nb

      const allocation = await allocate({
        context,
        blob,
        space,
        cause: invocation.link(),
      })

      const delivery = await put({
        blob,
        allocation,
      })

      const acceptance = await accept({
        context,
        blob,
        space,
        delivery,
      })

      // Create a result describing the this invocation workflow
      let result = Server.ok({
        /** @type {API.BlobAddSuccess['site']} */
        site: {
          'ucan/await': ['.out.ok.site', acceptance.task.link()],
        },
      })
        .fork(allocation.task)
        .fork(delivery.task)
        .fork(acceptance.task)

      // As a temporary solution we fork all add effects that add inline
      // receipts so they can be delivered to the client.
      const fx = [...allocation.fx, ...delivery.fx, ...acceptance.fx]
      for (const task of fx) {
        result = result.fork(task)
      }

      return result
    },
  })
}

/**
 * Performs an allocation for the given blob and produces an effect that submits
 * an allocation receipt to the store.
 *
 * @param {object} allocate
 * @param {API.BlobServiceContext} allocate.context
 * @param {API.BlobModel} allocate.blob
 * @param {API.DIDKey} allocate.space
 * @param {API.Link} allocate.cause
 */
async function allocate({ context, blob, space, cause }) {
  // 1. Create web3.storage/blob/allocate invocation and task
  const allocate = W3sBlob.allocate.invoke({
    issuer: context.id,
    audience: context.id,
    with: context.id.did(),
    nb: {
      blob,
      cause: cause,
      space,
    },
    expiration: Infinity,
  })
  const task = await allocate.delegate()

  const receipt = await allocate.execute(context.getServiceConnection())

  // 4. Create `blob/allocate` receipt as conclude invocation to inline as effect
  const concludeAllocate = createConcludeInvocation(
    context.id,
    context.id,
    receipt
  )

  return {
    task,
    receipt,
    fx: [await concludeAllocate.delegate()],
  }
}

/**
 * Create put task and check if there is a receipt for it already.
 * A `http/put` should be task is stored by the service, if it does not exist
 * and a receipt is fetched if already available.
 *
 * @param {object} put
 * @param {API.BlobModel} put.blob
 * @param {object} put.allocation
 * @param {API.Receipt<API.BlobAllocateSuccess, API.BlobAcceptFailure>} put.allocation.receipt
 */
async function put({ blob, allocation }) {
  // Derive the principal that will provide the blob from the blob digest.
  // we do this so that any actor with a blob could issue a receipt for the
  // `http/put` invocation.
  const blobProvider = await deriveDID(blob.digest)

  const put = HTTP.put.invoke({
    issuer: blobProvider,
    audience: blobProvider,
    with: blobProvider.toDIDKey(),
    nb: {
      body: blob,
      url: {
        'ucan/await': ['.out.ok.address.url', allocation.receipt.ran.link()],
      },
      headers: {
        'ucan/await': [
          '.out.ok.address.headers',
          allocation.receipt.ran.link(),
        ],
      },
    },
    // We encode the keys for the blob provider principal that can be used
    // by the client to use in order to sign a receipt. Client could
    // actually derive the same principal from the blob digest like we did
    // above, however by embedding the keys we make API more flexible and
    // could in the future generate one-off principals instead.
    facts: [{ keys: blobProvider.toArchive() }],
    // We use non-expiring invocation, mostly to make structure
    // deterministic, however we could also use different deterministic
    // expiration strategy e.g. based on the input of this invocation.
    expiration: Infinity,
  })

  const task = await put.delegate()
  let receipt = null

  // If allocation failed, error will propagate to the `put` task because
  // it's url and headers await on the successful allocation, which is why
  // we issue a receipt with propagated error when that is the case.
  if (allocation.receipt.out.error) {
    receipt = await Receipt.issue({
      issuer: blobProvider,
      ran: await put.delegate(),
      result: {
        error: new AwaitError({
          cause: allocation.receipt.out.error,
          at: '.out.ok.address.url',
          reference: allocation.receipt.ran.link(),
        }),
      },
    })
  }
  // If allocation was successful, but no address was returned we have a
  // blob in store already and we can issue a receipt for the `http/put`
  // without requiring blob to be provided.
  else if (allocation.receipt.out.ok.address == null) {
    receipt = await Receipt.issue({
      issuer: blobProvider,
      ran: task,
      result: { ok: {} },
    })
  }

  return {
    task,
    receipt,
    fx: receipt ? [await conclude(receipt, blobProvider)] : [],
  }
}

/**
 * Create accept and run task if there is no receipt.
 * A accept task can run when `http/put` receipt already exists.
 *
 * @param {object} input
 * @param {API.BlobServiceContext} input.context
 * @param {API.BlobModel} input.blob
 * @param {API.DIDKey} input.space
 * @param {object} input.delivery
 * @param {API.Invocation<API.HTTPPut>} input.delivery.task
 * @param {API.Receipt|null} input.delivery.receipt
 */
async function accept({ context, blob, space, delivery }) {
  // 1. Create web3.storage/blob/accept invocation and task
  const accept = W3sBlob.accept.invoke({
    issuer: context.id,
    audience: context.id,
    with: context.id.did(),
    nb: {
      blob,
      space,
      _put: { 'ucan/await': ['.out.ok', delivery.task.link()] },
    },
    expiration: Infinity,
  })
  const task = await accept.delegate()

  let receipt = null

  // If put has failed, we propagate the error the `blob/accept` receipt
  if (delivery.receipt?.out.error) {
    receipt = await Receipt.issue({
      issuer: context.id,
      ran: task,
      result: {
        error: new AwaitError({
          cause: delivery.receipt.out.error,
          at: '.out.ok',
          reference: delivery.task.link(),
        }),
      },
    })
  }
  // If put has already succeeded, we can execute `blob/accept` right away.
  else if (delivery.receipt?.out.ok) {
    receipt = await accept.execute(context.getServiceConnection())
  }

  return {
    task,
    receipt,
    fx: receipt ? [await conclude(receipt, context.id)] : [],
  }
}

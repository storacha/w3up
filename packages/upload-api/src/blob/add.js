import * as Server from '@ucanto/server'
import { Message, Receipt } from '@ucanto/core'
import * as Transport from '@ucanto/transport/car'
import { ed25519 } from '@ucanto/principal'
import * as Blob from '@storacha/capabilities/blob'
import * as SpaceBlob from '@storacha/capabilities/space/blob'
import * as W3sBlob from '@storacha/capabilities/web3.storage/blob'
import * as HTTP from '@storacha/capabilities/http'
import * as Digest from 'multiformats/hashes/digest'
import * as DID from '@ipld/dag-ucan/did'
import * as API from '../types.js'
import { allocate as spaceAllocate } from '../space-allocate.js'
import { createConcludeInvocation } from '../ucan/conclude.js'
import { AwaitError } from './lib.js'
import { AgentMessage } from '../lib.js'

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
 * @returns {API.ServiceMethod<API.SpaceBlobAdd, API.SpaceBlobAddSuccess, API.SpaceBlobAddFailure>}
 */
export function blobAddProvider(context) {
  return Server.provideAdvanced({
    capability: SpaceBlob.add,
    handler: async ({ capability, invocation }) => {
      const { with: space, nb } = capability
      const { blob } = nb

      const allocation = await allocate({
        context,
        blob,
        space,
        cause: invocation.link(),
      })
      if (allocation.error) {
        return allocation
      }

      const allocationW3s = await allocateW3s({
        context,
        blob,
        space,
        cause: invocation.link(),
        receipt: allocation.ok.receipt,
      })

      const delivery = await put({
        blob,
        allocation: allocation.ok,
      })

      const acceptance = await accept({
        context,
        provider: allocation.ok.provider,
        blob,
        space,
        cause: invocation.link(),
        delivery,
      })
      if (acceptance.error) {
        return acceptance
      }

      const acceptanceW3s = await acceptW3s({
        context,
        blob,
        space,
        delivery,
        acceptance: acceptance.ok,
      })

      // Create a result describing this invocation workflow
      let result = Server.ok({
        /** @type {API.SpaceBlobAddSuccess['site']} */
        site: {
          'ucan/await': ['.out.ok.site', acceptance.ok.task.link()],
        },
      })
        .fork(allocation.ok.task)
        .fork(allocationW3s.task)
        .fork(delivery.task)
        .fork(acceptance.ok.task)
        .fork(acceptanceW3s.task)

      // As a temporary solution we fork all add effects that add inline
      // receipts so they can be delivered to the client.
      const fx = [
        ...allocation.ok.fx,
        ...allocationW3s.fx,
        ...delivery.fx,
        ...acceptance.ok.fx,
        ...acceptanceW3s.fx,
      ]
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
  // First we check if space has storage provider associated. If it does not
  // we return `InsufficientStorage` error as storage capacity is considered
  // to be 0.
  const provisioned = await spaceAllocate(
    { capability: { with: space } },
    context
  )
  if (provisioned.error) {
    return provisioned
  }

  // 1. Create blob/allocate invocation and task
  const { router } = context
  const digest = Digest.decode(blob.digest)

  const candidate = await router.selectStorageProvider(digest, blob.size)
  if (candidate.error) {
    return candidate
  }

  const cap = Blob.allocate.create({
    with: candidate.ok.did(),
    nb: {
      blob: {
        digest: blob.digest,
        size: blob.size,
      },
      space: DID.parse(space),
      cause,
    },
  })

  const configure = await router.configureInvocation(candidate.ok, cap, {
    expiration: Infinity,
  })
  if (configure.error) {
    return configure
  }

  const task = await configure.ok.invocation.delegate()
  const receipt = await configure.ok.invocation.execute(configure.ok.connection)

  // record the invocation and the receipt, so we can retrieve it later when we
  // get a http/put receipt in ucan/conclude
  const message = await Message.build({
    invocations: [configure.ok.invocation],
    receipts: [receipt],
  })
  const messageWrite = await context.agentStore.messages.write({
    source: await Transport.outbound.encode(message),
    data: message,
    index: [...AgentMessage.index(message)],
  })
  if (messageWrite.error) {
    return messageWrite
  }

  // 4. Create `blob/allocate` receipt as conclude invocation to inline as effect
  const concludeAllocate = createConcludeInvocation(
    context.id,
    context.id,
    receipt
  )

  return Server.ok({
    provider: candidate.ok,
    task,
    receipt,
    fx: [await concludeAllocate.delegate()],
  })
}

/**
 * Create an allocation task and receipt using the legacy
 * `web3.storage/blob/allocate` capability. This enables backwards compatibility
 * with `@web3-storage/w3up-client`.
 *
 * TODO: remove when all users migrate to `@storacha/client`.
 *
 * @param {object} allocate
 * @param {API.BlobServiceContext} allocate.context
 * @param {API.BlobModel} allocate.blob
 * @param {API.DIDKey} allocate.space
 * @param {API.Link} allocate.cause
 * @param {API.Receipt<API.BlobAllocateSuccess, API.BlobAcceptFailure>} allocate.receipt
 */
async function allocateW3s({ context, blob, space, cause, receipt }) {
  const w3sAllocate = W3sBlob.allocate.invoke({
    issuer: context.id,
    audience: context.id,
    with: context.id.did(),
    nb: { blob, cause, space },
    expiration: Infinity,
  })
  const w3sAllocateTask = await w3sAllocate.delegate()

  const w3sAllocateReceipt = await Receipt.issue({
    issuer: context.id,
    ran: w3sAllocateTask.cid,
    result: receipt.out,
  })

  const w3sAllocateConclude = createConcludeInvocation(
    context.id,
    context.id,
    w3sAllocateReceipt
  )

  return {
    task: w3sAllocateTask,
    receipt: w3sAllocateReceipt,
    fx: [await w3sAllocateConclude.delegate()],
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
 * @param {API.Receipt<API.BlobAllocateSuccess, API.BlobAllocateFailure>} put.allocation.receipt
 */
async function put({ blob, allocation: { receipt: allocationReceipt } }) {
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
        'ucan/await': ['.out.ok.address.url', allocationReceipt.ran.link()],
      },
      headers: {
        'ucan/await': ['.out.ok.address.headers', allocationReceipt.ran.link()],
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
  if (allocationReceipt.out.error) {
    receipt = await Receipt.issue({
      issuer: blobProvider,
      ran: await put.delegate(),
      result: {
        error: new AwaitError({
          cause: allocationReceipt.out.error,
          at: '.out.ok.address.url',
          reference: allocationReceipt.ran.link(),
        }),
      },
    })
  }
  // If allocation was successful, but no address was returned we have a
  // blob in store already and we can issue a receipt for the `http/put`
  // without requiring blob to be provided.
  else if (allocationReceipt.out.ok.address == null) {
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
 * @param {API.Principal} input.provider
 * @param {API.BlobModel} input.blob
 * @param {API.DIDKey} input.space
 * @param {API.Link} input.cause Original `space/blob/add` invocation.
 * @param {object} input.delivery
 * @param {API.Invocation<API.HTTPPut>} input.delivery.task
 * @param {API.Receipt|null} input.delivery.receipt
 */
async function accept({
  context,
  provider,
  blob,
  space,
  cause,
  delivery: { task: deliveryTask, receipt: deliveryReceipt },
}) {
  // 1. Create blob/accept invocation and task
  const cap = Blob.accept.create({
    with: provider.did(),
    nb: {
      blob,
      space: DID.parse(space),
      _put: { 'ucan/await': ['.out.ok', deliveryTask.link()] },
    },
  })

  const configure = await context.router.configureInvocation(provider, cap, {
    expiration: Infinity,
  })
  if (configure.error) {
    return configure
  }

  const task = await configure.ok.invocation.delegate()

  let receipt = null

  // If put has failed, we propagate the error the `blob/accept` receipt
  if (deliveryReceipt?.out.error) {
    receipt = await Receipt.issue({
      issuer: context.id,
      ran: task,
      result: {
        error: new AwaitError({
          cause: deliveryReceipt.out.error,
          at: '.out.ok',
          reference: deliveryTask.link(),
        }),
      },
    })
  }
  // If put has already succeeded, we can execute `blob/accept` right away.
  else if (deliveryReceipt?.out.ok) {
    receipt = await configure.ok.invocation.execute(configure.ok.connection)

    // record the invocation and the receipt
    const message = await Message.build({
      invocations: [configure.ok.invocation],
      receipts: [receipt],
    })
    const messageWrite = await context.agentStore.messages.write({
      source: await Transport.outbound.encode(message),
      data: message,
      index: [...AgentMessage.index(message)],
    })
    if (messageWrite.error) {
      return messageWrite
    }

    const register = await context.registry.register({
      space,
      cause,
      blob: { digest: Digest.decode(blob.digest), size: blob.size },
    })
    if (register.error) {
      // it's ok if there's already a registration of this blob in this space
      if (register.error.name !== 'EntryExists') {
        return register
      }
    }
  }

  return Server.ok({
    task,
    receipt,
    fx: receipt ? [await conclude(receipt, context.id)] : [],
  })
}

/**
 * Create an accept task and receipt using the legacy
 * `web3.storage/blob/accept` capability. This enables backwards compatibility
 * with `@web3-storage/w3up-client`.
 *
 * TODO: remove when all users migrate to `@storacha/client`.
 *
 * @param {object} input
 * @param {API.BlobServiceContext} input.context
 * @param {API.BlobModel} input.blob
 * @param {API.DIDKey} input.space
 * @param {object} input.delivery
 * @param {API.Invocation<API.HTTPPut>} input.delivery.task
 * @param {API.Receipt|null} input.delivery.receipt
 * @param {object} input.acceptance
 * @param {API.Receipt|null} input.acceptance.receipt
 */
async function acceptW3s({
  context,
  blob,
  space,
  delivery: { task: deliveryTask, receipt: deliveryReceipt },
  acceptance: { receipt: acceptanceReceipt },
}) {
  // 1. Create web3.storage/blob/accept invocation and task
  const w3sAccept = W3sBlob.accept.invoke({
    issuer: context.id,
    audience: context.id,
    with: context.id.did(),
    nb: {
      blob,
      space,
      _put: { 'ucan/await': ['.out.ok', deliveryTask.link()] },
    },
    expiration: Infinity,
  })
  const w3sAcceptTask = await w3sAccept.delegate()

  let w3sAcceptReceipt = null
  // If put has failed, we propagate the error to the `blob/accept` receipt.
  if (deliveryReceipt?.out.error) {
    w3sAcceptReceipt = await Receipt.issue({
      issuer: context.id,
      ran: w3sAcceptTask,
      result: {
        error: new AwaitError({
          cause: deliveryReceipt.out.error,
          at: '.out.ok',
          reference: deliveryTask.link(),
        }),
      },
    })
  }
  // If `blob/accept` receipt is present, we issue a receipt for
  // `web3.storage/blob/accept`.
  else if (acceptanceReceipt) {
    w3sAcceptReceipt = await Receipt.issue({
      issuer: context.id,
      ran: w3sAcceptTask,
      result: acceptanceReceipt.out,
      fx: acceptanceReceipt.fx,
    })
  }

  return {
    task: w3sAcceptTask,
    fx: w3sAcceptReceipt ? [await conclude(w3sAcceptReceipt, context.id)] : [],
  }
}

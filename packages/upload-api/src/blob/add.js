import * as Server from '@ucanto/server'
import { ed25519 } from '@ucanto/principal'
import * as Blob from '@web3-storage/capabilities/blob'
import * as W3sBlob from '@web3-storage/capabilities/web3.storage/blob'
import * as HTTP from '@web3-storage/capabilities/http'
import * as API from '../types.js'

import { createConcludeInvocation } from '../ucan/conclude.js'
import { BlobSizeOutsideOfSupportedRange, AwaitError } from './lib.js'

/**
 * @param {API.BlobServiceContext} context
 * @returns {API.ServiceMethod<API.BlobAdd, API.BlobAddSuccess, API.BlobAddFailure>}
 */
export function blobAddProvider(context) {
  return Server.provideAdvanced({
    capability: Blob.add,
    handler: async ({ capability, invocation }) => {
      // Prepare context
      const { blob } = capability.nb
      const space = capability.with

      // Verify blob is within accept size
      if (blob.size > context.maxUploadSize) {
        return {
          error: new BlobSizeOutsideOfSupportedRange(
            blob.size,
            context.maxUploadSize
          ),
        }
      }

      // Create allocate task, get its receipt if available and execute it if necessary
      const allocateRes = await allocate({
        context,
        blob,
        space,
        cause: invocation.link(),
      })
      if (allocateRes.error) {
        return allocateRes
      }

      // Create put task and get its receipt if available
      const putRes = await put({
        context,
        blob,
        allocateTask: allocateRes.ok.task,
      })
      if (putRes.error) {
        return putRes
      }

      // Create accept task, get its receipt if available and execute if necessary and ready
      const acceptRes = await accept({
        context,
        blob,
        space,
        putTask: putRes.ok.task,
        putReceipt: putRes.ok.receipt,
      })
      if (acceptRes.error) {
        return acceptRes
      }

      // Create result object
      /** @type {API.OkBuilder<API.BlobAddSuccess, API.BlobAddFailure>} */
      const result = Server.ok({
        site: {
          'ucan/await': ['.out.ok.site', acceptRes.ok.task.link()],
        },
      })

      // If there is no receipt for `http/put` we also still are pending receipt for `accept`
      if (!putRes.ok.receipt || !acceptRes.ok.receipt) {
        return (
          result
            // 1. System attempts to allocate memory in user space for the blob.
            .fork(allocateRes.ok.task)
            .fork(allocateRes.ok.receipt)
            // 2. System requests user agent (or anyone really) to upload the content
            // corresponding to the blob
            // via HTTP PUT to given location.
            .fork(putRes.ok.task)
            // 3. System will attempt to accept uploaded content that matches blob
            // multihash and size.
            .join(acceptRes.ok.task)
        )
      }

      return (
        result
          // 1. System attempts to allocate memory in user space for the blob.
          .fork(allocateRes.ok.task)
          .fork(allocateRes.ok.receipt)
          // 2. System requests user agent (or anyone really) to upload the content
          // corresponding to the blob
          // via HTTP PUT to given location.
          .fork(putRes.ok.task)
          .fork(putRes.ok.receipt)
          // 3. System will attempt to accept uploaded content that matches blob
          // multihash and size.
          .join(acceptRes.ok.task)
          .fork(acceptRes.ok.receipt)
      )
    },
  })
}

/**
 * Create allocate and run task if there is no receipt for it already.
 * If there is a non expired receipt available, it is returned insted of runing the task again.
 * Otherwise, allocation task is executed.
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

  /** @type {import('@ucanto/interface').Receipt<import('@web3-storage/capabilities/types').BlobAllocateSuccess> | undefined} */
  let blobAllocateReceipt

  // 2. Get receipt for `blob/allocate` if available, otherwise schedule invocation
  const receiptGet = await context.receiptsStorage.get(task.link())
  if (receiptGet.error && receiptGet.error.name !== 'RecordNotFound') {
    return {
      error: receiptGet.error,
    }
  } else if (receiptGet.ok) {
    blobAllocateReceipt = receiptGet.ok

    // Verify if allocation is expired before "accepting" this receipt.
    // Note that if there is no address, means it was already allocated successfully before
    const expiresAt = blobAllocateReceipt?.out.ok?.address?.expiresAt
    if (expiresAt && new Date().getTime() > new Date(expiresAt).getTime()) {
      // if expired, we must see if blob was written to avoid allocating one more time
      const hasBlobStore = await context.blobsStorage.has(blob.digest)
      if (hasBlobStore.error) {
        return hasBlobStore
      } else if (!hasBlobStore.ok) {
        blobAllocateReceipt = undefined
      }
    }
  }

  // 3. if not already allocated (or expired) execute `blob/allocate`
  if (!blobAllocateReceipt) {
    // Create allocation task and save it
    const saveTask = await context.tasksStorage.put(task)
    if (!saveTask.ok) {
      return saveTask
    }
    // Execute allocate invocation
    const allocateRes = await allocate.execute(context.getServiceConnection())
    if (allocateRes.out.error) {
      return {
        error: new AwaitError({
          cause: allocateRes.out.error,
          at: 'ucan/wait',
          reference: ['.out.ok', task.link()],
        }),
      }
    }
    blobAllocateReceipt = allocateRes
  }

  // 4. Create `blob/allocate` receipt as conclude invocation to inline as effect
  const concludeAllocate = createConcludeInvocation(
    context.id,
    context.id,
    blobAllocateReceipt
  )

  return {
    ok: {
      task,
      receipt: await concludeAllocate.delegate(),
    },
  }
}

/**
 * Create put task and check if there is a receipt for it already.
 * A `http/put` should be task is stored by the service, if it does not exist
 * and a receipt is fetched if already available.
 *
 * @param {object} put
 * @param {API.BlobServiceContext} put.context
 * @param {API.BlobModel} put.blob
 * @param {API.Invocation<API.BlobAllocate>} put.allocateTask
 */
async function put({ context, blob, allocateTask }) {
  // 1. Create http/put invocation as task

  // We derive principal from the blob multihash to be an audience
  // of the `http/put` invocation. That way anyone with blob digest
  // could perform the invocation and issue receipt by deriving same
  // principal
  const blobProvider = await ed25519.derive(blob.digest.subarray(-32))
  const facts = [
    {
      keys: blobProvider.toArchive(),
    },
  ]
  const put = HTTP.put.invoke({
    issuer: blobProvider,
    audience: blobProvider,
    with: blobProvider.toDIDKey(),
    nb: {
      body: blob,
      url: {
        'ucan/await': ['.out.ok.address.url', allocateTask.link()],
      },
      headers: {
        'ucan/await': ['.out.ok.address.headers', allocateTask.link()],
      },
    },
    facts,
    expiration: Infinity,
  })
  const task = await put.delegate()

  // 2. Get receipt for `http/put` if available
  const receiptGet = await context.receiptsStorage.get(task.link())
  // Storage get can fail with `RecordNotFound` or other unexpected errors.
  // If 'RecordNotFound' we proceed, otherwise we fail with the received error.
  if (receiptGet.error && receiptGet.error.name !== 'RecordNotFound') {
    return {
      error: receiptGet.error,
    }
  } else if (receiptGet.ok) {
    // 3. Create `blob/allocate` receipt as conclude invocation to inline as effect
    const concludePut = createConcludeInvocation(
      context.id,
      context.id,
      receiptGet.ok
    )
    return {
      ok: {
        task,
        receipt: await concludePut.delegate(),
      },
    }
  }

  // 3. store `http/put` invocation
  const invocationPutRes = await context.tasksStorage.put(task)
  if (invocationPutRes.error) {
    return {
      error: invocationPutRes.error,
    }
  }

  return {
    ok: {
      task,
      receipt: undefined,
    },
  }
}

/**
 * Create accept and run task if there is no receipt.
 * A accept task can run when `http/put` receipt already exists.
 *
 * @param {object} accept
 * @param {API.BlobServiceContext} accept.context
 * @param {API.BlobModel} accept.blob
 * @param {API.DIDKey} accept.space
 * @param {API.Invocation<API.HTTPPut>} accept.putTask
 * @param {API.Invocation<API.UCANConclude>} [accept.putReceipt]
 */
async function accept({ context, blob, space, putTask, putReceipt }) {
  // 1. Create web3.storage/blob/accept invocation and task
  const accept = W3sBlob.accept.invoke({
    issuer: context.id,
    audience: context.id,
    with: context.id.did(),
    nb: {
      blob,
      space,
      _put: { 'ucan/await': ['.out.ok', putTask.link()] },
    },
    expiration: Infinity,
  })
  const task = await accept.delegate()

  // 2. If there is not put receipt, `accept` is still blocked
  if (!putReceipt) {
    return {
      ok: {
        task,
        receipt: undefined,
      },
    }
  }

  // 3. Get receipt for `blob/accept` if available, otherwise execute invocation
  let blobAcceptReceipt
  const receiptGet = await context.receiptsStorage.get(task.link())
  if (receiptGet.error && receiptGet.error.name !== 'RecordNotFound') {
    return {
      error: receiptGet.error,
    }
  } else if (receiptGet.ok) {
    blobAcceptReceipt = receiptGet.ok
  }

  // 4. if not already accepted execute `blob/accept`
  if (!blobAcceptReceipt) {
    // Execute accept invocation
    const acceptRes = await accept.execute(context.getServiceConnection())
    if (acceptRes.out.error) {
      return {
        error: new AwaitError({
          cause: acceptRes.out.error,
          at: 'ucan/wait',
          reference: ['.out.ok', task.link()],
        }),
      }
    }
    blobAcceptReceipt = acceptRes
  }

  // Create `blob/accept` receipt as conclude invocation to inline as effect
  const concludeAccept = createConcludeInvocation(
    context.id,
    context.id,
    blobAcceptReceipt
  )
  return {
    ok: {
      task,
      receipt: await concludeAccept.delegate(),
    },
  }
}

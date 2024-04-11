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
      const space = /** @type {import('@ucanto/interface').DIDKey} */ (
        Server.DID.parse(capability.with).did()
      )

      // Verify blob is within accept size
      if (blob.size > context.maxUploadSize) {
        return {
          error: new BlobSizeOutsideOfSupportedRange(context.maxUploadSize),
        }
      }

      // Create next tasks
      const next = await createNextTasks({
        context,
        blob,
        space,
        cause: invocation.link(),
      })

      // Schedule allocate
      const scheduleAllocateRes = await scheduleAllocate({
        context,
        blob,
        allocate: next.allocate,
        allocatefx: next.allocatefx,
      })
      if (scheduleAllocateRes.error) {
        return scheduleAllocateRes
      }

      // Schedule put
      const schedulePutRes = await schedulePut({
        context,
        putfx: next.putfx,
      })
      if (schedulePutRes.error) {
        return schedulePutRes
      }

      // Create result object
      /** @type {API.OkBuilder<API.BlobAddSuccess, API.BlobAddFailure>} */
      const result = Server.ok({
        site: {
          'ucan/await': ['.out.ok.site', next.acceptfx.link()],
        },
      })

      // In case there is no receipt for concludePutfx, we can return
      if (!schedulePutRes.ok.concludePutfx) {
        return (
          result
            // 1. System attempts to allocate memory in user space for the blob.
            .fork(next.allocatefx)
            .fork(scheduleAllocateRes.ok.concludeAllocatefx)
            // 2. System requests user agent (or anyone really) to upload the content
            // corresponding to the blob
            // via HTTP PUT to given location.
            .fork(next.putfx)
            // 3. System will attempt to accept uploaded content that matches blob
            // multihash and size.
            .join(next.acceptfx)
        )
      }

      // schedule accept if there is http/put receipt available
      const scheduleAcceptRes = await scheduleAccept({
        context,
        accept: next.accept,
        acceptfx: next.acceptfx,
      })
      if (scheduleAcceptRes.error) {
        return scheduleAcceptRes
      }

      return scheduleAcceptRes.ok.concludeAcceptfx
        ? result
            // 1. System attempts to allocate memory in user space for the blob.
            .fork(next.allocatefx)
            .fork(scheduleAllocateRes.ok.concludeAllocatefx)
            // 2. System requests user agent (or anyone really) to upload the content
            // corresponding to the blob
            // via HTTP PUT to given location.
            .fork(next.putfx)
            .fork(schedulePutRes.ok.concludePutfx)
            // 3. System will attempt to accept uploaded content that matches blob
            // multihash and size.
            .join(next.acceptfx)
            .fork(scheduleAcceptRes.ok.concludeAcceptfx)
        : result
            // 1. System attempts to allocate memory in user space for the blob.
            .fork(next.allocatefx)
            .fork(scheduleAllocateRes.ok.concludeAllocatefx)
            // 2. System requests user agent (or anyone really) to upload the content
            // corresponding to the blob
            // via HTTP PUT to given location.
            .fork(next.putfx)
            .fork(schedulePutRes.ok.concludePutfx)
            // 3. System will attempt to accept uploaded content that matches blob
            // multihash and size.
            .join(next.acceptfx)
    },
  })
}

/**
 * Schedule Put task to be run by agent.
 * A `http/put` task is stored by the service, if it does not exist
 * and a receipt is fetched if already available.
 *
 * @param {object} scheduleAcceptProps
 * @param {API.BlobServiceContext} scheduleAcceptProps.context
 * @param {API.IssuedInvocationView<API.BlobAccept>} scheduleAcceptProps.accept
 * @param {API.Invocation<API.BlobAccept>} scheduleAcceptProps.acceptfx
 */
async function scheduleAccept({ context, accept, acceptfx }) {
  let blobAcceptReceipt

  // Get receipt for `blob/accept` if available, otherwise schedule invocation
  const receiptGet = await context.receiptsStorage.get(acceptfx.link())
  if (receiptGet.error && receiptGet.error.name !== 'RecordNotFound') {
    return {
      error: receiptGet.error,
    }
  } else if (receiptGet.ok) {
    blobAcceptReceipt = receiptGet.ok
  }

  // if not already accepted schedule `blob/accept`
  if (!blobAcceptReceipt) {
    // Execute accept invocation
    const acceptRes = await accept.execute(context.getServiceConnection())
    if (acceptRes.out.error) {
      return {
        error: new AwaitError({
          cause: acceptRes.out.error,
          at: 'ucan/wait',
          reference: ['.out.ok', acceptfx.cid],
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
      concludeAcceptfx: await concludeAccept.delegate(),
    },
  }
}

/**
 * Schedule Put task to be run by agent.
 * A `http/put` task is stored by the service, if it does not exist
 * and a receipt is fetched if already available.
 *
 * @param {object} schedulePutProps
 * @param {API.BlobServiceContext} schedulePutProps.context
 * @param {API.Invocation<API.HTTPPut>} schedulePutProps.putfx
 */
async function schedulePut({ context, putfx }) {
  // Get receipt for `http/put` if available
  const receiptGet = await context.receiptsStorage.get(putfx.link())
  if (receiptGet.error && receiptGet.error.name !== 'RecordNotFound') {
    return {
      error: receiptGet.error,
    }
  } else if (receiptGet.ok) {
    // Create `blob/allocate` receipt as conclude invocation to inline as effect
    const concludePut = createConcludeInvocation(
      context.id,
      context.id,
      receiptGet.ok
    )
    return {
      ok: {
        concludePutfx: await concludePut.delegate(),
      },
    }
  }

  // store `http/put` invocation
  const invocationPutRes = await context.tasksStorage.put(putfx)
  if (invocationPutRes.error) {
    // TODO: If already available, do not error?
    return {
      error: invocationPutRes.error,
    }
  }

  // TODO: store implementation
  // const archiveDelegationRes = await putfx.archive()
  // if (archiveDelegationRes.error) {
  //   return {
  //     error: archiveDelegationRes.error
  //   }
  // }

  return {
    ok: {},
  }
}

/**
 * Schedule allocate task to be run.
 * If there is a non expired receipt, it is returned insted of runing the task again.
 * Otherwise, allocation task is scheduled.
 *
 * @param {object} scheduleAllocateProps
 * @param {API.BlobServiceContext} scheduleAllocateProps.context
 * @param {API.BlobModel} scheduleAllocateProps.blob
 * @param {API.IssuedInvocationView<API.BlobAllocate>} scheduleAllocateProps.allocate
 * @param {API.Invocation<API.BlobAllocate>} scheduleAllocateProps.allocatefx
 */
async function scheduleAllocate({ context, blob, allocate, allocatefx }) {
  /** @type {import('@ucanto/interface').Receipt<import('@web3-storage/capabilities/types').BlobAllocateSuccess> | undefined} */
  let blobAllocateReceipt

  // Get receipt for `blob/allocate` if available, otherwise schedule invocation
  const receiptGet = await context.receiptsStorage.get(allocatefx.link())
  if (receiptGet.error && receiptGet.error.name !== 'RecordNotFound') {
    return {
      error: receiptGet.error,
    }
  } else if (receiptGet.ok) {
    // @ts-expect-error ts not able to cast receipt
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

  // if not already allocated (or expired) schedule `blob/allocate`
  if (!blobAllocateReceipt) {
    // Execute allocate invocation
    const allocateRes = await allocate.execute(context.getServiceConnection())
    if (allocateRes.out.error) {
      return {
        error: new AwaitError({
          cause: allocateRes.out.error,
          at: 'ucan/wait',
          reference: ['.out.ok', allocatefx.cid],
        }),
      }
    }
    blobAllocateReceipt = allocateRes
  }

  // Create `blob/allocate` receipt as conclude invocation to inline as effect
  const concludeAllocate = createConcludeInvocation(
    context.id,
    context.id,
    blobAllocateReceipt
  )
  return {
    ok: {
      concludeAllocatefx: await concludeAllocate.delegate(),
    },
  }
}

/**
 * Create `blob/add` next tasks.
 *
 * @param {object} nextProps
 * @param {API.BlobServiceContext} nextProps.context
 * @param {API.BlobModel} nextProps.blob
 * @param {API.DIDKey} nextProps.space
 * @param {API.Link} nextProps.cause
 */
async function createNextTasks({ context, blob, space, cause }) {
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
  const allocatefx = await allocate.delegate()

  // 2. Create http/put invocation ans task

  // We derive principal from the blob multihash to be an audience
  // of the `http/put` invocation. That way anyone with blob digest
  // could perform the invocation and issue receipt by deriving same
  // principal
  const blobProvider = await ed25519.derive(
    blob.digest.slice(blob.digest.length - 32)
  )
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
        'ucan/await': ['.out.ok.address.url', allocatefx.cid],
      },
      headers: {
        'ucan/await': ['.out.ok.address.headers', allocatefx.cid],
      },
    },
    facts,
    expiration: Infinity,
  })
  const putfx = await put.delegate()

  // 3. Create web3.storage/blob/accept invocation and task
  const accept = W3sBlob.accept.invoke({
    issuer: context.id,
    audience: context.id,
    with: context.id.did(),
    nb: {
      blob,
      space,
      _put: { 'ucan/await': ['.out.ok', putfx.link()] },
    },
    expiration: Infinity,
  })
  const acceptfx = await accept.delegate()

  return {
    allocate,
    allocatefx,
    put,
    putfx,
    accept,
    acceptfx,
  }
}

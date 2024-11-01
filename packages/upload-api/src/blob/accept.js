import * as Server from '@ucanto/server'
import * as DID from '@ipld/dag-ucan/did'
import * as W3sBlob from '@storacha/capabilities/web3.storage/blob'
import { Assert } from '@web3-storage/content-claims/capability'
import { Invocation } from '@ucanto/core'
import * as Digest from 'multiformats/hashes/digest'
import * as API from '../types.js'
import {
  AllocatedMemoryHadNotBeenWrittenTo,
  UnsupportedCapability,
} from './lib.js'
import * as HTTP from '@storacha/capabilities/http'

/**
 * @param {API.W3ServiceContext} context
 * @returns {API.ServiceMethod<API.W3sBlobAccept, API.BlobAcceptSuccess, API.BlobAcceptFailure>}
 */
export function blobAcceptProvider(context) {
  return Server.provideAdvanced({
    capability: W3sBlob.accept,
    handler: async ({ capability }) => {
      // Only service principal can perform an allocation
      if (capability.with !== context.id.did()) {
        return {
          error: new UnsupportedCapability({ capability }),
        }
      }

      const { blob, space } = capability.nb
      const digest = Digest.decode(blob.digest)
      // If blob is not stored, we must fail
      const hasBlob = await context.blobsStorage.has(digest)
      if (hasBlob.error) {
        return hasBlob
      } else if (!hasBlob.ok) {
        return {
          error: new AllocatedMemoryHadNotBeenWrittenTo(),
        }
      }

      const createUrl = await context.blobsStorage.createDownloadUrl(digest)
      if (createUrl.error) {
        return createUrl
      }

      const locationClaim = await Assert.location.delegate({
        issuer: context.id,
        audience: DID.parse(space),
        with: context.id.toDIDKey(),
        nb: {
          content: { digest: digest.bytes },
          location: [createUrl.ok],
        },
        expiration: Infinity,
      })

      // Create result object
      /** @type {API.OkBuilder<API.BlobAcceptSuccess, API.BlobAcceptFailure>} */
      const result = Server.ok({
        site: locationClaim.cid,
      })

      return result.fork(locationClaim)
    },
  })
}

/**
 * Polls `blob/accept` task whenever we receive a receipt. It may error if passed
 * receipt is for `http/put` task that refers to the `blob/allocate` that we
 * are unable to find.
 *
 * @param {API.ConcludeServiceContext} context
 * @param {API.Receipt} receipt
 * @returns {Promise<API.Result<{}, API.StorageGetError>>}
 */
export const poll = async (context, receipt) => {
  const ran = Invocation.isInvocation(receipt.ran)
    ? { ok: receipt.ran }
    : await context.agentStore.invocations.get(receipt.ran)

  // If can not find an invocation for this receipt there is nothing to do here,
  // if it was receipt for `http/put` we would have invocation record.
  if (!ran.ok) {
    return { ok: {} }
  }

  // Detect if this receipt is for an `http/put` invocation
  const put = /** @type {?API.HTTPPut} */ (
    ran.ok.capabilities.find(({ can }) => can === HTTP.put.can)
  )

  // If it's not an http/put invocation nothing to do here.
  if (put == null) {
    return { ok: {} }
  }

  // TODO: LOOKUP IN ALLOCATIONS STORAGE AS WE DON"T HAVE THIS INVOCATION

  // Otherwise we are going to lookup allocation corresponding to this http/put
  // in order to issue blob/accept.
  const [, allocation] = /** @type {API.UCANAwait} */ (put.nb.url)['ucan/await']
  const result = await context.agentStore.invocations.get(allocation)
  // If could not find blob/allocate invocation there is something wrong in
  // the system and we return error so it could be propagated to the user. It is
  // not a proper solution as user can not really do anything, but still seems
  // better than silently ignoring, this way user has a chance to report a
  // problem. Client test could potentially also catch errors.
  if (result.error) {
    return result
  }

  const [allocate] = /** @type {[API.W3sBlobAllocate]} */ (result.ok.capabilities)

  // If this is a receipt for the http/put we will perform blob/accept.
  const blobAccept = await W3sBlob.accept.invoke({
    issuer: context.id,
    audience: context.id,
    with: context.id.did(),
    nb: {
      blob: put.nb.body,
      space: allocate.nb.space,
      _put: {
        'ucan/await': ['.out.ok', receipt.ran.link()],
      },
    },
    // ⚠️ We need invocation to be deterministic which is why we use exact
    // same as it is on allocation which will guarantee that expiry is the
    // same regardless when we received `http/put` receipt.
    //
    // ℹ️ This works around the fact that we index receipts by invocation link
    // as opposed to task link which would not care about the expiration.
    expiration: result.ok.expiration,
  })

  // We do not care about the result we just want receipt to be issued and
  // stored.
  await blobAccept.execute(context.getServiceConnection())

  return { ok: {} }
}

import * as Blob from '@storacha/capabilities/blob'
import { Message, Invocation } from '@ucanto/core'
import * as Transport from '@ucanto/transport/car'
import * as API from '../types.js'
import * as HTTP from '@storacha/capabilities/http'
import * as DID from '@ipld/dag-ucan/did'
import * as Digest from 'multiformats/hashes/digest'
import { AgentMessage } from '../lib.js'

/**
 * Polls `blob/accept` task whenever we receive a receipt. It may error if passed
 * receipt is for `http/put` task that refers to the `blob/allocate` that we
 * are unable to find.
 *
 * @param {API.ConcludeServiceContext} context
 * @param {API.Receipt} receipt
 * @returns {Promise<API.Result<API.Unit, API.Failure>>}
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
  const put = /** @type {API.HTTPPut} */ (
    ran.ok.capabilities.find(({ can }) => can === HTTP.put.can)
  )

  // If it's not an http/put invocation nothing to do here.
  if (put == null) {
    return { ok: {} }
  }

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

  const provider = result.ok.audience
  const [allocate] = /** @type {[API.BlobAllocate]} */ (result.ok.capabilities)

  const configure = await context.router.configureInvocation(
    provider,
    Blob.accept.create({
      with: provider.did(),
      nb: {
        blob: allocate.nb.blob,
        space: allocate.nb.space,
        _put: {
          'ucan/await': ['.out.ok', receipt.ran.link()],
        },
      },
    }),
    {
      // ⚠️ We need invocation to be deterministic which is why we use exact
      // same as it is on allocation which will guarantee that expiry is the
      // same regardless when we received `http/put` receipt.
      //
      // ℹ️ This works around the fact that we index receipts by invocation link
      // as opposed to task link which would not care about the expiration.
      expiration: result.ok.expiration,
    }
  )
  if (configure.error) {
    return configure
  }

  const acceptReceipt = await configure.ok.invocation.execute(
    configure.ok.connection
  )

  // record the invocation and the receipt
  const message = await Message.build({
    invocations: [configure.ok.invocation],
    receipts: [acceptReceipt],
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
    space: /** @type {API.SpaceDID} */ (DID.decode(allocate.nb.space).did()),
    cause: allocate.nb.cause,
    blob: {
      digest: Digest.decode(allocate.nb.blob.digest),
      size: allocate.nb.blob.size,
    },
  })
  if (register.error) {
    // it's ok if there's already a registration of this blob in this space
    if (register.error.name !== 'EntryExists') {
      return register
    }
  }

  return { ok: {} }
}

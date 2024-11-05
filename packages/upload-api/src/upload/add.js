import * as Server from '@ucanto/server'
import * as Upload from '@storacha/capabilities/upload'
import * as API from '../types.js'
import { allocate } from '../space-allocate.js'

/**
 * @param {API.UploadServiceContext} context
 * @returns {API.ServiceMethod<API.UploadAdd, API.UploadAddSuccess, API.Failure>}
 */
export function uploadAddProvider(context) {
  return Server.provide(Upload.add, async ({ capability, invocation }) => {
    const { uploadTable } = context
    const { root, shards } = capability.nb
    const space = /** @type {import('@ucanto/interface').DIDKey} */ (
      Server.DID.parse(capability.with).did()
    )
    const issuer = invocation.issuer.did()
    const allocated = await allocate(
      {
        capability: {
          with: space,
        },
      },
      context
    )
    if (allocated.error) {
      return allocated
    }

    return uploadTable.upsert({
      space,
      root,
      shards,
      issuer,
      cause: invocation.cid,
    })
  })
}

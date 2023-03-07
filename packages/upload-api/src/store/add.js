import * as Server from '@ucanto/server'
import * as Store from '@web3-storage/capabilities/store'
import * as API from '../types.js'

/**
 * @param {API.StoreServiceContext} context
 * @returns {API.ServiceMethod<API.StoreAdd, API.StoreAddOk, API.Failure>}
 */
export function storeAddProvider({
  access,
  storeTable,
  carStoreBucket,
  maxUploadSize,
}) {
  return Server.provide(Store.add, async ({ capability, invocation }) => {
    const { link, origin, size } = capability.nb
    const space = Server.DID.parse(capability.with).did()
    const issuer = invocation.issuer.did()
    const [allocated, carIsLinkedToAccount, carExists] = await Promise.all([
      access.allocateSpace(invocation),
      storeTable.exists(space, link),
      carStoreBucket.has(link),
    ])

    // If failed to allocate space, fail with allocation error
    if (allocated.error) {
      return allocated
    }

    if (!carIsLinkedToAccount) {
      await storeTable.insert({
        space,
        link,
        size,
        origin,
        issuer,
        invocation: invocation.cid,
      })
    }

    if (carExists) {
      return {
        status: 'done',
        with: space,
        link,
      }
    }

    if (size > maxUploadSize) {
      // checking this last, as larger CAR may already exist in bucket from pinning service fetch.
      // we only want to prevent this here so we don't give the user a PUT url they can't use.
      return new Server.Failure(
        `Size must not exceed ${maxUploadSize}. Split CAR into smaller shards`
      )
    }

    const { url, headers } = await carStoreBucket.createUploadUrl(link, size)
    return {
      status: 'upload',
      with: space,
      link,
      url,
      headers,
    }
  })
}

import * as Server from '@ucanto/server'
import * as Store from '@web3-storage/capabilities/store'
import * as API from '../types.js'
import { allocate } from '../space-allocate.js'

/**
 * @param {API.StoreServiceContext} context
 * @returns {API.ServiceMethod<API.StoreAdd, API.StoreAddOk, API.Failure>}
 */
export function storeAddProvider(context) {
  const { storeTable, carStoreBucket, maxUploadSize } = context
  return Server.provide(Store.add, async ({ capability, invocation }) => {
    const { link, origin, size } = capability.nb

    if (size > maxUploadSize) {
      return {
        error: new Server.Failure(
          `Maximum size exceeded: ${maxUploadSize}, split DAG into smaller shards.`
        ),
      }
    }

    const space = /** @type {import('@ucanto/interface').DIDKey} */ (
      Server.DID.parse(capability.with).did()
    )
    const issuer = invocation.issuer.did()
    const [allocated, carIsLinkedToAccount, carExists] = await Promise.all([
      allocate(
        {
          capability: {
            with: space,
          },
        },
        context
      ),
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
        ok: {
          status: 'done',
          with: space,
          link,
        },
      }
    }

    const { url, headers } = await carStoreBucket.createUploadUrl(link, size)
    return {
      ok: {
        status: 'upload',
        with: space,
        link,
        url,
        headers,
      },
    }
  })
}

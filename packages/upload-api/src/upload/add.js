import pRetry from 'p-retry'
import * as Server from '@ucanto/server'
import * as Upload from '@web3-storage/capabilities/upload'
import * as API from '../types.js'
import { allocate } from '../space-allocate.js'

/**
 * @param {API.UploadServiceContext} context
 * @returns {API.ServiceMethod<API.UploadAdd, API.UploadAddSuccess, API.Failure>}
 */
export function uploadAddProvider(context) {
  return Server.provide(Upload.add, async ({ capability, invocation }) => {
    const { uploadTable, dudewhereBucket } = context
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

    const [res] = await Promise.all([
      // Store in Database
      uploadTable.upsert({
        space,
        root,
        shards,
        issuer,
        invocation: invocation.cid,
      }),
      writeDataCidToCarCidsMapping(dudewhereBucket, root, shards),
    ])

    return res
  })
}

/**
 * Writes to a "bucket DB" the mapping from a data CID to the car CIDs it is composed of.
 * Retries up to 3 times, in case of failures.
 *
 * @param {import("../types.js").DudewhereBucket} dudewhereStore
 * @param {Server.API.Link<unknown, number, number, 0 | 1>} root
 * @param {Server.API.Link<unknown, 514, number, 1>[] | undefined} shards
 */
async function writeDataCidToCarCidsMapping(dudewhereStore, root, shards) {
  const dataCid = root.toString()
  const carCids =
    shards?.map((/** @type {{ toString: () => any; }} */ s) => s.toString()) ||
    []

  return Promise.all(
    carCids.map(async (/** @type {string} */ carCid) => {
      await pRetry(() => dudewhereStore.put(dataCid, carCid), { retries: 3 })
    })
  )
}

import * as Server from '@ucanto/server'
import { ok, error } from '@ucanto/server'
import * as Index from '@web3-storage/capabilities/index'
import { ShardedDAGIndex } from '@web3-storage/blob-index'
import { Assert } from '@web3-storage/content-claims/capability'
import { concat } from 'uint8arrays'
import * as API from '../types.js'

/**
 * The size of the batch to process when checking shard allocations.
 * This is a heuristic to avoid memory issues when processing large indexes.
 */
const ALLOCATION_BATCH_SIZE = 10_000

/**
 * @param {API.IndexServiceContext} context
 * @returns {API.ServiceMethod<API.IndexAdd, API.IndexAddSuccess, API.IndexAddFailure>}
 */
export const provide = (context) =>
  Server.provide(Index.add, (input) => add(input, context))

/**
 * @param {API.Input<Index.add>} input
 * @param {API.IndexServiceContext} context
 * @returns {Promise<API.Result<API.IndexAddSuccess, API.IndexAddFailure>>}
 */
const add = async ({ capability }, context) => {
  const space = capability.with
  const idxLink = capability.nb.index

  // ensure the index was stored in the agent's space
  const idxAllocRes = await assertAllocated(
    context,
    space,
    idxLink.multihash,
    'IndexNotFound'
  )
  if (!idxAllocRes.ok) return idxAllocRes

  // fetch the index from the network
  const idxBlobRes = await context.blobRetriever.stream(idxLink.multihash)
  if (!idxBlobRes.ok) {
    if (idxBlobRes.error.name === 'BlobNotFound') {
      return error(
        /** @type {API.IndexNotFound} */
        ({ name: 'IndexNotFound', digest: idxLink.multihash.bytes })
      )
    }
    return idxBlobRes
  }

  /** @type {Uint8Array[]} */
  const chunks = []
  await idxBlobRes.ok.pipeTo(
    new WritableStream({
      write: (chunk) => {
        chunks.push(chunk)
      },
    })
  )

  const idxRes = ShardedDAGIndex.extract(concat(chunks))
  if (!idxRes.ok) return idxRes
  return await batchProcessIndexChunks(idxRes.ok, space, context, idxLink)
}

/**
 * Batch process all chunks of the index.
 *
 * @param {import('@web3-storage/blob-index/types').ShardedDAGIndexView} index
 * @param {API.SpaceDID} space
 * @param {API.IndexServiceContext} context
 * @param {API.CARLink} idxLink
 */
async function batchProcessIndexChunks(index, space, context, idxLink) {
  const shardDigests = [...index.shards.keys()]

  // Process shard allocations in batches
  for (let i = 0; i < shardDigests.length; i += ALLOCATION_BATCH_SIZE) {
    const batch = shardDigests.slice(i, i + ALLOCATION_BATCH_SIZE)

    // Each batch can be processed concurrently
    const batchResults = await Promise.all(
      batch.map((shard) =>
        assertAllocated(context, space, shard, 'ShardNotFound')
      )
    )

    for (const res of batchResults) {
      if (res.error) return res
    }
  }

  // TODO: randomly validate slices in the index correspond to slices in the blob

  const publishRes = await Promise.all([
    // publish the index data to IPNI
    context.ipniService.publish(index),
    // publish a content claim for the index
    publishIndexClaim(context, { content: index.content, index: idxLink }),
  ])
  for (const res of publishRes) {
    if (res.error) return res
  }
  return ok({})
}

/**
 * @param {{ allocationsStorage: import('../types.js').AllocationsStorage }} context
 * @param {API.SpaceDID} space
 * @param {import('multiformats').MultihashDigest} digest
 * @param {'IndexNotFound'|'ShardNotFound'|'SliceNotFound'} errorName
 * @returns {Promise<API.Result<API.Unit, API.IndexNotFound|API.ShardNotFound|API.SliceNotFound|API.Failure>>}
 */
const assertAllocated = async (context, space, digest, errorName) => {
  const result = await context.allocationsStorage.exists(space, digest)
  if (result.error) return result
  if (!result.ok)
    return error(
      /** @type {API.IndexNotFound|API.ShardNotFound|API.SliceNotFound} */
      ({ name: errorName, digest: digest.bytes })
    )
  return ok({})
}

/**
 * @param {API.ClaimsClientContext} ctx
 * @param {{ content: API.UnknownLink, index: API.CARLink }} params
 */
const publishIndexClaim = async (ctx, { content, index }) => {
  const { invocationConfig, connection } = ctx.claimsService
  const { issuer, audience, with: resource, proofs } = invocationConfig
  const res = await Assert.index
    .invoke({
      issuer,
      audience,
      with: resource,
      nb: { content, index },
      expiration: Infinity,
      proofs,
    })
    .execute(connection)
  return res.out
}

import * as Server from '@ucanto/server'
import { ok, error } from '@ucanto/server'
import * as SpaceIndex from '@storacha/capabilities/space/index'
import { ShardedDAGIndex } from '@storacha/blob-index'
import { Assert } from '@web3-storage/content-claims/capability'
import { concat } from 'uint8arrays'
import * as API from '../types.js'

/**
 * @param {API.IndexServiceContext} context
 * @returns {API.ServiceMethod<API.SpaceIndexAdd, API.SpaceIndexAddSuccess, API.SpaceIndexAddFailure>}
 */
export const provide = (context) =>
  Server.provide(SpaceIndex.add, (input) => add(input, context))

/**
 * @param {API.Input<SpaceIndex.add>} input
 * @param {API.IndexServiceContext} context
 * @returns {Promise<API.Result<API.SpaceIndexAddSuccess, API.SpaceIndexAddFailure>>}
 */
const add = async ({ capability }, context) => {
  const space = capability.with
  const idxLink = capability.nb.index

  // ensure the index was stored in the agent's space
  const idxAllocRes = await assertRegistered(
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

  // ensure indexed shards are allocated in the agent's space
  const shardDigests = [...idxRes.ok.shards.keys()]
  const shardAllocRes = await Promise.all(
    shardDigests.map((s) =>
      assertRegistered(context, space, s, 'ShardNotFound')
    )
  )
  for (const res of shardAllocRes) {
    if (res.error) return res
  }

  // TODO: randomly validate slices in the index correspond to slices in the blob

  const publishRes = await publishIndexClaim(context, {
    content: idxRes.ok.content,
    index: idxLink,
  })
  if (publishRes.error) {
    return publishRes
  }
  return ok({})
}

/**
 * @param {{ registry: import('../types/blob.js').Registry }} context
 * @param {API.SpaceDID} space
 * @param {import('multiformats').MultihashDigest} digest
 * @param {'IndexNotFound'|'ShardNotFound'|'SliceNotFound'} errorName
 * @returns {Promise<API.Result<API.Unit, API.IndexNotFound|API.ShardNotFound|API.SliceNotFound|API.Failure>>}
 */
const assertRegistered = async (context, space, digest, errorName) => {
  const result = await context.registry.find(space, digest)
  if (result.error) {
    if (result.error.name === 'EntryNotFound') {
      return error(
        /** @type {API.IndexNotFound|API.ShardNotFound|API.SliceNotFound} */
        ({ name: errorName, digest: digest.bytes })
      )
    }
    return result
  }
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

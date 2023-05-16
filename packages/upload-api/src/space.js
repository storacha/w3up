import { Space } from '@web3-storage/capabilities'
import { DID } from '@ucanto/validator'
import * as Provider from '@ucanto/server'
import * as API from './types.js'

/**
 * @param {API.Input<Space.info>} input
 * @param {API.SpaceServiceContext} ctx
 * @returns {Promise<API.Result<{ did: API.SpaceDID }, API.Failure>>}
 */
export const info = async ({ capability }, ctx) => {
  const spaceDid = capability.with
  if (!DID.match({ method: 'key' }).is(spaceDid)) {
    /** @type {API.SpaceUnknown} */
    const unexpectedSpaceDidFailure = {
      name: 'SpaceUnknown',
      message: `can only get info for did:key spaces`,
    }
    return {
      error: unexpectedSpaceDidFailure,
    }
  }

  const result = await ctx.provisionsStorage.hasStorageProvider(spaceDid)
  if (result.ok) {
    return {
      ok: { did: spaceDid },
    }
  }

  /** @type {import('@web3-storage/access/types').SpaceUnknown} */
  const spaceUnknownFailure = {
    name: 'SpaceUnknown',
    message: `Space not found.`,
  }
  return {
    error: spaceUnknownFailure,
  }
}

/**
 * @param {API.SpaceServiceContext} ctx
 */
export const createService = (ctx) => ({
  info: Provider.provide(Space.info, (input) => info(input, ctx)),
})

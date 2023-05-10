import { Space } from '@web3-storage/capabilities'
import { DID } from '@ucanto/validator'
import * as Provider from '@ucanto/server'
import * as Types from './types'

/**
 * @param {Types.Input<Space.info>} input
 * @param {Types.SpaceServiceContext} ctx
 * @returns {Promise<Types.Result<{ did: Types.SpaceDID }, Types.Failure>>}
 */
export const info = async ({ capability }, ctx) => {
  const { provisions } = ctx.models

  const spaceDid = capability.with
  if (!DID.match({ method: 'key' }).is(spaceDid)) {
    /** @type {Types.SpaceUnknown} */
    const unexpectedSpaceDidFailure = {
      name: 'SpaceUnknown',
      message: `can only get info for did:key spaces`,
    }
    return {
      error: unexpectedSpaceDidFailure,
    }
  }

  const result = await provisions.hasStorageProvider(spaceDid)
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
 * @param {Types.SpaceServiceContext} ctx
 */
export const createService = (ctx) => ({
  info: Provider.provide(Space.info, (input) => info(input, ctx)),
})

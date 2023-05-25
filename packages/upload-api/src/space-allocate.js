import * as API from './types.js'
import * as Server from '@ucanto/server'
import * as Space from '@web3-storage/capabilities/space'

/**
 *
 * @param {{capability: {with: API.SpaceDID, nb:{size:number}}}} input
 * @param {API.SpaceServiceContext} context
 * @returns {Promise<API.Result<{size:number}, API.AllocationError>>}
 */
export const allocate = async ({ capability }, context) => {
  const { with: space, nb } = capability
  if ((await context.provisionsStorage.isSpaceBlocked(space)).ok) {
    return {
      error: {
        name: 'InsufficientStorage',
        message: `${space} is blocked`
      }
    }
  }
  const { size } = nb
  const result = await context.provisionsStorage.hasStorageProvider(space)
  if (result.ok) {
    return { ok: { size } }
  }

  return {
    /** @type {API.AllocationError} */
    error: {
      name: 'InsufficientStorage',
      message: `${space} has no storage provider`,
    },
  }
}

/**
 *
 * @param {API.SpaceServiceContext} context
 */
export const provide = (context) =>
  Server.provide(Space.allocate, (input) => allocate(input, context))

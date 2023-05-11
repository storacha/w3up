import * as Types from './types.js'
import * as Server from '@ucanto/server'
import * as Space from '@web3-storage/capabilities/space'

/**
 *
 * @param {{capability: {with: Types.SpaceDID, nb:{size:number}}}} input
 * @param {Types.SpaceServiceContext} context
 * @returns {Promise<Types.Result<{size:number}, Types.AllocationError>>}
 */
export const allocate = async ({ capability }, context) => {
  const { with: space, nb } = capability
  const { size } = nb
  const result = await context.provisionsStorage.hasStorageProvider(space)
  if (result.ok) {
    return { ok: { size } }
  }

  return {
    /** @type {Types.AllocationError} */
    error: {
      name: 'InsufficientStorage',
      message: `${space} has no storage provider`,
    },
  }
}

/**
 *
 * @param {Types.SpaceServiceContext} context
 */
export const provide = (context) =>
  Server.provide(Space.allocate, (input) => allocate(input, context))

import * as API from '../api.js'
import * as Server from '@ucanto/server'
import * as Space from '@web3-storage/capabilities/space'

/**
 * @typedef {object} Context
 * @property {object} models
 * @property {API.SpaceProviderRegistry} models.provisions
 * @property {API.SpaceProviderRegistry} [models.spaces]
 *
 * @param {{capability: {with: API.SpaceDID, nb:{size:number}}}} input
 * @param {Context} context
 * @returns {Promise<API.Result<{size:number}, API.AllocationError>>}
 */
export const allocate = async ({ capability }, context) => {
  const { with: space, nb } = capability
  const { size } = nb
  const { provisions, spaces } = context.models
  const result = await provisions.hasStorageProvider(space)
  if (result.ok) {
    return { ok: { size } }
  } else if (spaces) {
    const result = await spaces.hasStorageProvider(space)
    if (result.ok) {
      return { ok: { size } }
    }
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
 * @param {Context} context
 */
export const provide = (context) =>
  Server.provide(Space.allocate, (input) => allocate(input, context))

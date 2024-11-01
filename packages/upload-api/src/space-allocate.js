import * as API from './types.js'
import * as Server from '@ucanto/server'
import * as Ucanto from '@ucanto/interface'
import * as Space from '@storacha/capabilities/space'
import { ensureRateLimitAbove } from './utils/rate-limits.js'

/**
 *
 * @param {{capability: {with: API.SpaceDID}}} input
 * @param {API.SpaceServiceContext} context
 * @returns {Promise<API.Result<Ucanto.Unit, API.AllocationError>>}
 */
export const allocate = async ({ capability }, context) => {
  const { with: space } = capability
  const rateLimitResult = await ensureRateLimitAbove(
    context.rateLimitsStorage,
    [space],
    0
  )
  if (rateLimitResult.error) {
    return {
      error: {
        name: 'InsufficientStorage',
        message: `${space} is blocked`,
      },
    }
  }
  const result = await context.provisionsStorage.hasStorageProvider(space)
  if (result.ok) {
    return { ok: {} }
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

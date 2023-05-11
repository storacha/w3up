import { Console } from '@web3-storage/capabilities'
import * as Provider from '@ucanto/server'
import * as Types from './types.js'

/**
 * @param {Types.Input<Console.log>} input
 * @returns {Promise<Types.Result<{}, never>>}
 */
export const log = async ({ capability }) => {
  const ok = capability.nb.value == null ? {} : capability.nb.value
  return { ok }
}

/**
 * @param {Types.Input<Console.error>} input
 * @returns {Promise<Types.Result<never, Types.Failure & { cause: unknown }>>}
 */
export const error = async ({ capability }) => {
  const cause = capability.nb.error == null ? {} : capability.nb.error
  return {
    error: {
      name: 'Error',
      message: 'Error from console',
      cause,
    },
  }
}

/**
 * @param {Types.ConsoleServiceContext} ctx
 */
export const createService = (ctx) => ({
  log: Provider.provide(Console.log, (input) => log(input)),
  error: Provider.provide(Console.error, (input) => error(input)),
})

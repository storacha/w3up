import { Console } from '@web3-storage/capabilities'
import * as Provider from '@ucanto/server'
import * as API from '../api.js'

/**
 * @param {API.Input<Console.log>} input
 * @returns {Promise<API.Result<{}, never>>}
 */
export const log = async ({ capability }) => {
  const ok = capability.nb.value == null ? {} : capability.nb.value
  return { ok }
}

/**
 * @param {API.Input<Console.error>} input
 * @returns {Promise<API.Result<never, API.Failure & { cause: unknown }>>}
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
 * @param {API.RouteContext} ctx
 */
export const provide = (ctx) => ({
  log: Provider.provide(Console.log, (input) => log(input)),
  error: Provider.provide(Console.error, (input) => error(input)),
})

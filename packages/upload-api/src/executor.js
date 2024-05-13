// @ts-nocheck
import * as API from '../test/types.js'
import * as Server from '@ucanto/server'

/**
 * @typedef {object} Context
 * @property {Store<Uint8Array, API.AgentMessage>} messageStore
 */

/**
 * @template K, V
 * @typedef {object} Store
 * @property {(data: V) => Promise<API.Result<{}, Error>>} put
 */

/**
 * @template {Record<string, any>} T
 * @param {API.AgentMessage} input
 * @param {API.Server<T>} server
 * @param {Context} context
 * @returns {Promise<API.Result<API.AgentMessage<T>, Error>>}
 */
export const execute = async (input, server, context) => {
  const saveInput = await context.messageStore.put(input)
  if (saveInput.error) {
    return saveInput
  }

  const output = await Server.execute(
    input,
    // Execute does not actually require view
    /** @type {API.ServerView<T>} */ (server)
  )

  const saveOutput = await context.messageStore.put(output)
  if (saveOutput.error) {
    return saveOutput
  }
}

/**
 * @param {API.Invocation} invocation
 */
export const run = async (invocation) => {}

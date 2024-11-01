import * as API from '../types.js'
import * as Provider from '@ucanto/server'
import { Consumer } from '@storacha/capabilities'

/**
 * @param {API.ConsumerServiceContext} context
 */
export const provide = (context) =>
  Provider.provide(Consumer.has, (input) => has(input, context))

/**
 * @param {API.Input<Consumer.has>} input
 * @param {API.ConsumerServiceContext} context
 * @returns {Promise<API.Result<API.ConsumerHasSuccess, API.ConsumerHasFailure>>}
 */
export const has = async ({ capability }, context) => {
  if (capability.with !== context.signer.did()) {
    return Provider.fail(
      `Expected with to be ${context.signer.did()}} instead got ${
        capability.with
      }`
    )
  }

  return context.provisionsStorage.hasStorageProvider(capability.nb.consumer)
}

import * as API from '../types.js'
import * as Provider from '@ucanto/server'
import { Consumer } from '@web3-storage/capabilities'

/**
 * @param {API.ConsumerServiceContext} context
 */
export const provide = (context) =>
  // @ts-ignore
  Provider.provide(Consumer.has, (input) => has(input, context))

/**
 * @param {{capability: {with: API.ProviderDID, nb: { consumer: API.DIDKey }}}} input
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

import * as Types from '../types'
import * as Provider from '@ucanto/server'
import { Consumer } from '@web3-storage/capabilities'

/**
 * @param {Types.ConsumerServiceContext} context
 */
export const provide = (context) =>
  Provider.provide(Consumer.has, (input) => has(input, context))

/**
 * @param {Types.Input<Consumer.has>} input
 * @param {Types.ConsumerServiceContext} context
 * @returns {Promise<Types.Result<boolean, Types.Failure>>}
 */
const has = async ({ capability }, context) => {
  if (capability.with !== context.signer.did()) {
    return Provider.fail(
      `Expected with to be ${context.signer.did()}} instead got ${
        capability.with
      }`
    )
  }

  return context.models.provisions.hasStorageProvider(capability.nb.consumer)
}

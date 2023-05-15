import * as Types from './types.js'
import * as Server from '@ucanto/server'
import { Provider } from '@web3-storage/capabilities'
import * as validator from '@ucanto/validator'

/**
 * @param {Types.ProviderServiceContext} ctx
 */
export const provide = (ctx) =>
  Server.provide(Provider.add, (input) => add(input, ctx))

/**
 * @param {Types.Input<Provider.add>} input
 * @param {Types.ProviderServiceContext} context
 */
export const add = async (
  { capability, invocation },
  { provisionsStorage: provisions }
) => {
  const {
    nb: { consumer, provider },
    with: accountDID,
  } = capability
  if (!validator.DID.match({ method: 'mailto' }).is(accountDID)) {
    return {
      error: {
        name: 'Unauthorized',
        message: 'Issuer must be a mailto DID',
      },
    }
  }
  if (!provisions.services.includes(provider)) {
    return {
      error: {
        name: 'InvalidProvider',
        message: `Invalid provider: ${provider}`,
      },
    }
  }

  return await provisions.put({
    // eslint-disable-next-line object-shorthand
    invocation: /** @type {Types.Invocation<Types.ProviderAdd>} */ (invocation),
    space: consumer,
    provider,
    account: accountDID,
  })
}

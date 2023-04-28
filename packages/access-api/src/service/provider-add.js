import * as API from '../api.js'
import * as Server from '@ucanto/server'
import { Provider } from '@web3-storage/capabilities'
import * as validator from '@ucanto/validator'

/**
 * @param {Context} ctx
 */
export const provide = (ctx) =>
  Server.provide(Provider.add, (input) => add(input, ctx))

/**
 * @typedef {object} Context
 * @property {object} models
 * @property {API.ProvisionsStorage} models.provisions
 *
 * @param {API.Input<Provider.add>} input
 * @param {Context} context
 */
export const add = async (
  { capability, invocation },
  { models: { provisions } }
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
    invocation: /** @type {API.Invocation<API.ProviderAdd>} */ (invocation),
    space: consumer,
    // eslint-disable-next-line object-shorthand
    provider: provider,
    account: accountDID,
  })
}

import * as API from './types.js'
import * as Server from '@ucanto/server'
import { Provider } from '@web3-storage/capabilities'
import * as validator from '@ucanto/validator'
import { emailAndDomainFromMailtoDid } from './utils/did-mailto.js'
import { areAnyBlocked } from './utils/rate-limits.js'

/**
 * @param {API.ProviderServiceContext} ctx
 */
export const provide = (ctx) =>
  Server.provide(Provider.add, (input) => add(input, ctx))

/**
 * @param {API.Input<Provider.add>} input
 * @param {API.ProviderServiceContext} context
 */
export const add = async (
  { capability, invocation },
  { provisionsStorage: provisions, rateLimitsStorage: rateLimits }
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
  const isBlocked = await areAnyBlocked(
    rateLimits,
    emailAndDomainFromMailtoDid(
      /** @type {import('@web3-storage/did-mailto/dist/src/types').DidMailto} */ (
        accountDID
      )
    )
  )
  if (isBlocked.error || isBlocked.ok) {
    return {
      error: {
        name: 'AccountBlocked',
        message: `Account identified by {capability.nb.iss} is blocked`,
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
  if ((await provisions.hasStorageProvider(consumer)).ok) {
    return {
      error: {
        name: 'SpaceAlreadyProvisioned',
        message: `${consumer} already has a storage provider`,
      },
    }
  }

  return await provisions.put({
    // eslint-disable-next-line object-shorthand
    cause: /** @type {API.Invocation<API.ProviderAdd>} */ (invocation),
    consumer,
    provider,
    customer: accountDID,
  })
}

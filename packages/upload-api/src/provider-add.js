import * as API from './types.js'
import * as Server from '@ucanto/server'
import { Provider } from '@storacha/capabilities'
import * as validator from '@ucanto/validator'
import { mailtoDidToDomain, mailtoDidToEmail } from './utils/did-mailto.js'
import { ensureRateLimitAbove } from './utils/rate-limits.js'

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
  {
    provisionsStorage: provisions,
    rateLimitsStorage: rateLimits,
    plansStorage,
    requirePaymentPlan,
  }
) => {
  const {
    nb: { consumer, provider },
    with: accountDID,
  } = capability
  if (!validator.DID.match({ method: 'mailto' }).is(accountDID)) {
    return {
      error: {
        name: 'Unauthorized',
        message: 'Resource must be a mailto DID',
      },
    }
  }
  const accountMailtoDID =
    /** @type {import('@storacha/did-mailto/types').DidMailto} */ (accountDID)
  const rateLimitResult = await ensureRateLimitAbove(
    rateLimits,
    [mailtoDidToDomain(accountMailtoDID), mailtoDidToEmail(accountMailtoDID)],
    0
  )
  if (rateLimitResult.error) {
    return {
      error: {
        name: 'AccountBlocked',
        message: `Account identified by ${accountMailtoDID} is blocked`,
      },
    }
  }

  if (requirePaymentPlan) {
    const planGetResult = await plansStorage.get(accountMailtoDID)
    if (!planGetResult.ok?.product) {
      return {
        error: {
          name: 'AccountPlanMissing',
          message: `Account identified by ${accountMailtoDID} has not selected a payment plan`,
        },
      }
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

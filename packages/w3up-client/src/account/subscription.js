import * as API from '../types.js'
import { Provider, Subscription } from '@web3-storage/capabilities'

/**
 * @param {API.BillingPlan} plan
 * @returns {API.AccountSubscriptions}
 */
export const from = (plan) => new AccountSubscriptions(plan)

/**
 * @param {API.BillingPlan} plan
 * @param {object} subscription
 * @param {API.SpaceDID} subscription.consumer
 * @param {API.Limit} [subscription.limit]
 */
export const add = async ({ account, provider }, { consumer }) => {
  const { session } = account

  const { out: result } = await Provider.add
    .invoke({
      issuer: session.agent.signer,
      audience: session.connection.id,
      with: account.did(),
      nb: {
        provider: Provider.Provider.from(provider),
        consumer,
      },
      proofs: account.proofs,
    })
    .execute(session.connection)

  return result
}

/**
 * @param {API.BillingPlan} plan
 * @returns {Promise<API.Result<API.Subscriptions, API.SubscriptionListFailure>>}
 */

export const list = async ({ account }) => {
  const { session } = account

  const customer = account.did()
  const { out: result } = await Subscription.list
    .invoke({
      issuer: session.agent.signer,
      audience: session.connection.id,
      with: customer,
      proofs: account.proofs,
      nb: {},
    })
    .execute(session.connection)

  if (result.error) {
    return result
  } else {
    /** @type {API.Subscriptions} */
    // Note we cast to any because there is no way to make TS accept that
    // subscriptions is dictionary.
    const subscriptions = /** @type {any} */ (new Subscriptions())
    for (const { provider, consumers } of result.ok.results) {
      for (const consumer of consumers) {
        subscriptions[`${consumer}:${customer}@${provider}`] = {
          customer,
          consumer,
          provider,
          limit: {},
        }
      }
    }

    return { ok: Object.assign(new Subscriptions(), subscriptions) }
  }
}

class Subscriptions {
  *[Symbol.iterator]() {
    yield* Object.values(this)
  }
}

/**
 * @template {API.PlanProtocol & API.ProviderProtocol & API.SubscriptionProtocol} [Protocol=API.W3UpProtocol]
 */
class AccountSubscriptions {
  /**
   * @param {API.BillingPlan<Protocol>} plan
   */
  constructor(plan) {
    this.plan = plan
  }
  get account() {
    return this.plan.account
  }

  /**
   * @param {object} subscription
   * @param {API.SpaceDID} subscription.consumer
   * @param {API.Limit} [subscription.limit]
   */
  add(subscription) {
    return add(this.plan, subscription)
  }

  /**
   *
   */
  list() {
    return list(this.plan)
  }
}

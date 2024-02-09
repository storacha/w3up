import * as API from '../types.js'
import { Provider } from '@web3-storage/capabilities'

/**
 * @template {API.PlanProtocol & API.ProviderProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.BillingPlan<Protocol>} plan
 */
export const from = (plan) => new AccountSubscriptions(plan)

/**
 * @template {API.PlanProtocol & API.ProviderProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.BillingPlan<Protocol>} plan
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
    })
    .execute(
      /** @type {API.Session<API.ProviderProtocol>} */ (session).connection
    )

  return result
}

/**
 * @template {API.PlanProtocol & API.ProviderProtocol} [Protocol=API.W3UpProtocol]
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
}

import * as API from '../types.js'
import { Plan } from '@web3-storage/capabilities'
import * as Subscriptions from './subscription.js'

/**
 * @template {API.PlanProtocol & API.ProviderProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.AccountView<Protocol>} account
 */
export const from = (account) => new AccountPlans(account)

/**
 * @template {API.PlanProtocol & API.ProviderProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.AccountView<Protocol>} account
 */
export const list = async (account) => {
  const { session } = account
  const { out: result } = await Plan.get
    .invoke({
      issuer: session.agent.signer,
      audience: session.connection.id,
      with: account.did(),
      proofs: account.proofs,
    })
    .execute(/** @type {API.Session<API.PlanProtocol>} */ (session).connection)

  if (result.ok) {
    const plans = {
      [result.ok.product]: new BillingPlan({
        account: account,
        plan: result.ok,
      }),
    }

    return { ok: plans }
  } else {
    return result.error.name === 'PlanNotFound' ? { ok: {} } : result
  }
}

/**
 * @template {API.PlanProtocol & API.ProviderProtocol} [Protocol=API.W3UpProtocol]
 */
class AccountPlans {
  /**
   * @param {API.AccountView<Protocol>} account
   */
  constructor(account) {
    this.account = account
  }
  list() {
    return list(this.account)
  }
}

/**
 * @template {API.PlanProtocol & API.ProviderProtocol} [Protocol=API.W3UpProtocol]
 */
class BillingPlan {
  /**
   * @param {object} source
   * @param {API.AccountView<Protocol>} source.account
   * @param {API.PlanGetSuccess} source.plan
   */
  constructor(source) {
    this.model = source
    this.subscriptions = Subscriptions.from(this)
  }
  get account() {
    return this.model.account
  }

  get customer() {
    return this.model.account.did()
  }
  get provider() {
    return /** @type {API.ProviderDID} */ (
      this.model.account.session.connection.id.did()
    )
  }
}

import * as API from '../types.js'
import { Plan } from '@web3-storage/capabilities'
import * as Subscriptions from './subscription.js'
import * as Agent from '../agent.js'

/**
 * @template {API.PlanProtocol & API.ProviderProtocol & API.SubscriptionProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.AccountSession<Protocol>} account
 * @returns {API.AccountPlans<Protocol>}
 */
export const from = (account) => new AccountPlans(account)

/**
 * @template {API.PlanProtocol & API.ProviderProtocol & API.SubscriptionProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.AccountSession<Protocol>} account
 * @returns {Promise<API.Result<API.AccountPlanList<Protocol>, API.AccessDenied | API.PlanNotFound | API.InvocationError>>}
 */
export const list = async (account) => {
  const { session } = account
  const auth = Agent.authorize(account.session.agent, {
    subject: account.did(),
    can: {
      'plan/get': [],
    },
  })

  if (auth.error) {
    return auth
  }

  const { out: result } = await Plan.get
    .invoke({
      issuer: session.agent.signer,
      audience: session.connection.id,
      with: account.did(),
      proofs: auth.ok.proofs,
    })
    .execute(/** @type {API.Session<API.PlanProtocol>} */ (session).connection)

  /** @type {API.AccountPlanList<Protocol>}  */
  const plans = /** @type {any} */ (new AccountPlanList())
  if (result.ok) {
    plans[result.ok.product] = new BillingPlan({
      account: account,
      plan: result.ok,
    })

    return { ok: plans }
  } else {
    return result.error.name === 'PlanNotFound' ? { ok: plans } : result
  }
}

/**
 * @template {API.PlanProtocol & API.ProviderProtocol & API.SubscriptionProtocol} [Protocol=API.W3UpProtocol]
 * @implements {API.AccountPlans<Protocol>}
 */
class AccountPlans {
  /**
   * @param {API.AccountSession<Protocol>} account
   */
  constructor(account) {
    this.account = account
  }
  list() {
    return list(this.account)
  }
}

class AccountPlanList {
  *[Symbol.iterator]() {
    yield* Object.values(this)
  }
}

/**
 * @template {API.PlanProtocol & API.ProviderProtocol & API.SubscriptionProtocol} [Protocol=API.W3UpProtocol]
 * @implements {API.BillingPlan<Protocol>}
 */
class BillingPlan {
  /**
   * @param {object} source
   * @param {API.AccountSession<Protocol>} source.account
   * @param {API.PlanGetSuccess} source.plan
   */
  constructor(source) {
    this.model = source
    /** @type {API.AccountSubscriptions} */
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

import * as API from '../types.js'
import { Plan } from '@web3-storage/capabilities'
import * as Subscriptions from './subscription.js'
import * as Agent from '../agent.js'
import * as Task from '../task.js'
import * as Session from '../session.js'

/**
 * @template {API.AccountProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.AccountSession<Protocol>} account
 * @returns {API.AccountPlans}
 */
export const from = (account) => new AccountPlans(account)

/**
 * @param {API.AccountSession<API.PlanProtocol & API.SubscriptionProtocol & API.ProviderProtocol>} account
 */
export function* list(account) {
  const { session } = account
  const auth = yield* Agent.authorize(account.session.agent, {
    subject: account.did(),
    can: {
      'plan/get': [],
    },
  })

  const task = Plan.get.invoke({
    issuer: session.agent.signer,
    audience: session.connection.id,
    with: account.did(),
    proofs: auth.proofs,
  })

  const receipt = yield* Session.execute(session, task).receipt()

  /** @type {API.AccountPlanList}  */
  const plans = /** @type {any} */ (new AccountPlanList())
  if (receipt.out.ok) {
    plans[receipt.out.ok.product] = new BillingPlan({
      account: account,
      // We really should add the provider info into the plan response instead
      // of assuming that it is the DID of the service.
      provider: /** @type {API.ProviderDID} */ (session.connection.id.did()),
      plan: receipt.out.ok,
      receipt,
    })

    return plans
  } else if (receipt.out.error.name === 'PlanNotFound') {
    return plans
  } else {
    return yield* Task.fail(
      /** @type {API.InvocationError & { receipt: API.Receipt }} */
      (
        Object.assign(new Error(receipt.out.error.message), {
          name: receipt.out.error,
          receipt,
        })
      )
    )
  }
}

/**
 * @template {API.AccountProtocol} [Protocol=API.W3UpProtocol]
 * @implements {API.AccountPlans}
 */
class AccountPlans {
  /**
   * @param {API.AccountSession<Protocol>} account
   */
  constructor(account) {
    this.account = account
  }
  list() {
    return Task.perform(list(this.account))
  }
}

class AccountPlanList {
  *[Symbol.iterator]() {
    yield* Object.values(this)
  }
}

/**
 * @template {API.SubscriptionProtocol & API.ProviderProtocol} [Protocol=API.W3UpProtocol]
 * @implements {API.BillingPlan}
 */
class BillingPlan {
  /**
   * @param {object} source
   * @param {API.AccountSession<Protocol>} source.account
   * @param {API.ProviderDID} source.provider
   * @param {API.PlanGetSuccess} source.plan
   * @param {API.Receipt<API.PlanGetSuccess, API.PlanGetFailure | API.InvocationError>} source.receipt
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

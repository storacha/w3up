import * as API from '../types.js'
import { Provider, Subscription } from '@web3-storage/capabilities'
import * as Agent from '../agent.js'
import * as Session from '../session.js'
import * as Task from '../task.js'

/**
 * @param {API.BillingPlanSession} source
 * @returns {API.AccountSubscriptions}
 */
export const from = (source) => new AccountSubscriptions(source)

/**
 * @param {API.BillingPlanSession} session
 * @param {object} subscription
 * @param {API.SpaceDID} subscription.consumer
 * @param {API.Limit} [subscription.limit]
 */
export function* add({ account, provider }, { consumer }) {
  const { session } = account
  const auth = yield* Agent.authorize(account.session.agent, {
    subject: account.did(),
    can: {
      'provider/add': [],
    },
  })

  const task = Provider.add.invoke({
    issuer: session.agent.signer,
    audience: session.connection.id,
    with: account.did(),
    nb: {
      provider: Provider.Provider.from(provider),
      consumer,
    },
    proofs: auth.proofs,
  })

  return yield* Session.execute(session, task).receipt()
}

/**
 * @param {API.BillingPlanSession} session
 */
export function* list({ account }) {
  const { session } = account

  const customer = account.did()
  const auth = yield* Agent.authorize(account.session.agent, {
    subject: customer,
    can: {
      'subscription/list': [],
    },
  })

  const task = Subscription.list.invoke({
    issuer: session.agent.signer,
    audience: session.connection.id,
    with: customer,
    proofs: auth.proofs,
    nb: {},
  })

  const { results } = yield* Session.execute(session, task)

  /** @type {API.Subscriptions} */
  // Note we cast to any because there is no way to make TS accept that
  // subscriptions is dictionary.
  const subscriptions = /** @type {any} */ (new Subscriptions())
  for (const { provider, consumers } of results) {
    for (const consumer of consumers) {
      subscriptions[`${consumer}:${customer}@${provider}`] = {
        customer,
        consumer,
        provider,
        limit: {},
      }
    }
  }

  return subscriptions
}

class Subscriptions {
  *[Symbol.iterator]() {
    yield* Object.values(this)
  }
}

/**
 * @implements {API.AccountSubscriptions}
 */
class AccountSubscriptions {
  /**
   * @param {API.BillingPlanSession} model
   */
  constructor(model) {
    this.model = model
  }
  get account() {
    return this.model.account.did()
  }

  /**
   * @param {object} subscription
   * @param {API.SpaceDID} subscription.consumer
   * @param {API.Limit} [subscription.limit]
   */
  add(subscription) {
    return Session.perform(add(this.model, subscription))
  }

  list() {
    return Task.perform(list(this.model))
  }
}

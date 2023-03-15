/**
 * Consumer Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Provider from '@web3-storage/capabilities/consumer'
 * ```
 *
 * @module
 */
import * as Schema from './schema.js'
import { equalWith, fail, equal } from './utils.js'

export const Provision = Schema.struct({
  /**
   * Space DID capabilities are provisioned to by a provider.
   */
  consumer: Schema.Space,
  /**
   * Account DID that
   */
  customer: Schema.Account,
  /**
   * Order is a CID that identifies provider subscription. It is opaque
   * identifier that can be used to enforce various constraints by the
   * provider. For example provider could derive an order info from the user
   * account and use it to enforce that only one space can be added per user.
   */
  order: Schema.link({ version: 1 }),
})

/**
 * Capability provider delegates to a customer account when subscrpition is
 * created.
 */
export const consumer = Schema.capability({
  can: 'consumer/*',
  with: Schema.Provider,
  nb: Schema.struct({
    order: Schema.link(),
  }),
})

/**
 * Adds a consumer to a subscription.
 *
 * @see https://github.com/web3-storage/specs/blob/main/w3-provider.md#consumeradd-invocation
 */
export const add = Schema.capability({
  can: 'consumer/add',
  with: Schema.Provider,
  nb: Provision,
  derives: (child, parent) => {
    return (
      fail(equalWith(child, parent)) ||
      fail(equal(child.nb.consumer, parent.nb.consumer, 'consumer')) ||
      fail(equal(child.nb.order, parent.nb.order, 'order')) ||
      true
    )
  },
})

/**
 * Removes a consumer from the subscription.
 */
export const remove = Schema.capability({
  can: 'consumer/remove',
  with: Schema.Provider,
  nb: Provision,
})

/**
 * Lists consumers.
 */
export const list = Schema.capability({
  can: 'consumer/list',
  with: Schema.Provider,
  nb: Schema.struct({
    order: Schema.link().optional(),
  }),
})

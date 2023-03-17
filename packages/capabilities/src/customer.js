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

/**
 * Lists all subscriptions that provider has. If optional `customer` is provided
 * then will only list subscriptions for that customer.
 */
export const list = Schema.capability({
  with: Schema.Provider,
  can: 'customer/list',
  nb: Schema.struct({
    customer: Schema.Account.optional(),
    order: Schema.link({ version: 1 }).optional(),
  }),
})

/**
 * Adds a `customer` subscription to a provider.
 */
export const add = Schema.capability({
  with: Schema.Provider,
  can: 'customer/add',
  nb: Schema.struct({
    /**
     * Must be a link to the signed `consumer/*` capability.
     */
    provision: Schema.link({ version: 1 }),
  }),
})

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
 * Lists account subscriptions. Optional `provider` and `order` cane be
 * specified to filter the results.
 */
export const list = Schema.capability({
  with: Schema.Account,
  can: 'subscription/list',
  nb: Schema.struct({
    provider: Schema.Provider.optional(),
    order: Schema.link({ version: 1 }).optional(),
  }),
})

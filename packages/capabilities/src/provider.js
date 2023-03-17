/**
 * Provider Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Provider from '@web3-storage/capabilities/provider'
 * ```
 *
 * @module
 */
import { equalWith, fail, equal } from './utils.js'
import * as Schema from './schema.js'

/**
 * Capability can be invoked by an agent to add a provider to a space.
 */
export const add = Schema.capability({
  can: 'provider/add',
  with: Schema.Account,
  nb: Schema.struct({
    provider: Schema.Provider,
    consumer: Schema.Space,
  }),
  derives: (child, parent) => {
    return (
      fail(equalWith(child, parent)) ||
      fail(equal(child.nb.provider, parent.nb.provider, 'provider')) ||
      fail(equal(child.nb.consumer, parent.nb.consumer, 'consumer')) ||
      true
    )
  },
})

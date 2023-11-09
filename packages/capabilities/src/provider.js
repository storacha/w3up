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
import { capability, DID, struct, ok } from '@ucanto/validator'
import { AccountDID, equalWith, and, equal, SpaceDID } from './utils.js'

// e.g. did:web:web3.storage or did:web:staging.web3.storage
export const Provider = DID.match({ method: 'web' })

export { AccountDID }

/**
 * Capability can be invoked by an agent to add a provider to a space.
 */
export const add = capability({
  can: 'provider/add',
  with: AccountDID,
  nb: struct({
    provider: Provider,
    consumer: SpaceDID,
  }),
  derives: (child, parent) => {
    return (
      and(equalWith(child, parent)) ||
      and(equal(child.nb.provider, parent.nb.provider, 'provider')) ||
      and(equal(child.nb.consumer, parent.nb.consumer, 'consumer')) ||
      ok({})
    )
  },
})

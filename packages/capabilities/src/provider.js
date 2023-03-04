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
import { capability, DID, literal, struct } from '@ucanto/validator'
import { equalWith, fail, equal } from './utils.js'

export const StorageProvider = literal(
  'did:web:web3.storage:providers:w3up-alpha'
)

export const AccountDID = DID.match({ method: 'mailto' })

/**
 * Capability can be invoked by an agent to add a provider to a space.
 */
export const add = capability({
  can: 'provider/add',
  with: AccountDID,
  nb: struct({
    provider: StorageProvider,
    consumer: DID.match({ method: 'key' }),
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

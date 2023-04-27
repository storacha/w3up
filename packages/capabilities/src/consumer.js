import { capability, DID, struct, ok } from '@ucanto/validator'
import { equalWith, and, equal } from './utils.js'

// e.g. did:web:web3.storage or did:web:staging.web3.storage
export const ProviderDID = DID.match({ method: 'web' })

export const SpaceDID = DID.match({ method: 'key' })

/**
 * Capability can be invoked by a provider to check if it has given space as
 * a customer.
 */
export const has = capability({
  can: 'consumer/has',
  with: ProviderDID,
  nb: struct({
    consumer: SpaceDID,
  }),
  derives: (child, parent) => {
    return (
      and(equalWith(child, parent)) ||
      and(equal(child.nb.consumer, parent.nb.consumer, 'consumer')) ||
      ok({})
    )
  },
})

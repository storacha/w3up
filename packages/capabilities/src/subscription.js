import { capability, DID, struct, ok, Schema } from '@ucanto/validator'
import { equalWith, and, equal } from './utils.js'

// e.g. did:web:web3.storage or did:web:staging.web3.storage
export const ProviderDID = DID.match({ method: 'web' })

/**
 * Capability can be invoked by a provider to get information about a subscription.
 */
export const get = capability({
  can: 'subscription/get',
  with: ProviderDID,
  nb: struct({
    subscription: Schema.string(),
  }),
  derives: (child, parent) => {
    return (
      and(equalWith(child, parent)) ||
      and(equal(child.nb.subscription, parent.nb.subscription, 'consumer')) ||
      ok({})
    )
  },
})

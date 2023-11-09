import { capability, DID, struct, ok, Schema } from '@ucanto/validator'
import { AccountDID, equalWith, and, equal } from './utils.js'

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

/**
 * Capability can be invoked to retrieve the list of subscriptions for an
 * account.
 */
export const list = capability({
  can: 'subscription/list',
  with: AccountDID,
  derives: equalWith,
})

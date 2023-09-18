import { capability, DID, struct, ok } from '@ucanto/validator'
import { equalWith, and, equal, SpaceDID } from './utils.js'

// e.g. did:web:web3.storage or did:web:staging.web3.storage
export const ProviderDID = DID.match({ method: 'web' })

/**
 * Capability can be invoked by a provider to check if it has given space as
 * a consumer.
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

/**
 * Capability can be invoked by a provider to get information about a consumer.
 */
export const get = capability({
  can: 'consumer/get',
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

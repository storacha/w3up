import { capability, DID, struct, ok } from '@ucanto/validator'
import { AccountDID, equalWith, and, equal } from './utils.js'

// e.g. did:web:web3.storage or did:web:staging.web3.storage
export const ProviderDID = DID.match({ method: 'web' })

/**
 * Capability can be invoked by a provider to get information about the
 * customer.
 */
export const get = capability({
  can: 'customer/get',
  with: ProviderDID,
  nb: struct({
    customer: AccountDID,
  }),
  derives: (child, parent) => {
    return (
      and(equalWith(child, parent)) ||
      and(equal(child.nb.customer, parent.nb.customer, 'customer')) ||
      ok({})
    )
  },
})

import { capability, struct, ok, Link } from '@ucanto/validator'
import { equalWith, and, equal, ProviderDID } from './utils.js'

export const shard = capability({
  can: 'shard/*',
  with: ProviderDID,
  derives: equalWith,
})

/**
 * Capability can be invoked by a provider to get information about the
 * customer.
 */
export const get = capability({
  can: 'shard/get',
  with: ProviderDID,
  nb: struct({
    cid: Link,
  }),
  derives: (child, parent) => {
    return (
      and(equalWith(child, parent)) ||
      and(equal(child.nb.cid, parent.nb.cid, 'cid')) ||
      ok({})
    )
  },
})

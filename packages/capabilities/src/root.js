import { capability, struct, ok, Link } from '@ucanto/validator'
import { equalWith, and, equal, ProviderDID } from './utils.js'

export const root = capability({
  can: 'root/*',
  with: ProviderDID,
  derives: equalWith,
})

/**
 * Capability can be invoked by a provider to get information about an upload root CID.
 */
export const get = capability({
  can: 'root/get',
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

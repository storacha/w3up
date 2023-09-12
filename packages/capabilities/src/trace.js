import { capability, struct, ok, Link } from '@ucanto/validator'
import { equalWith, and, equal, ProviderDID } from './utils.js'

export const trace = capability({
  can: 'trace/*',
  with: ProviderDID,
  derives: equalWith,
})

export const upload = {
  /**
   * Capability can be invoked by a provider to get information about a content CID.
   */
  add: capability({
    can: 'trace/upload/add',
    with: ProviderDID,
    nb: struct({
      root: Link,
    }),
    derives: (child, parent) => {
      return (
        and(equalWith(child, parent)) ||
        and(equal(child.nb.root, parent.nb.root, 'root')) ||
        ok({})
      )
    },
  })
}

export const store = {
  /**
   * Capability can be invoked by a provider to get information an upload shard CID.
   */
  add: capability({
    can: 'trace/store/add',
    with: ProviderDID,
    nb: struct({
      link: Link,
    }),
    derives: (child, parent) => {
      return (
        and(equalWith(child, parent)) ||
        and(equal(child.nb.link, parent.nb.link, 'link')) ||
        ok({})
      )
    },
  })
}
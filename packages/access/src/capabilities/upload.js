import { capability, Link, URI } from '@ucanto/validator'
import { codec } from '@ucanto/transport/car'
import { equalWith, fail, equal } from './utils.js'
import { any } from './any.js'

/**
 * All the `upload/*` capabilities which can also be derived
 * from `any` (a.k.a `*`) capability.
 */
export const upload = any.derive({
  to: capability({
    can: 'upload/*',
    with: URI.match({ protocol: 'did:' }),
    derives: equalWith,
  }),
  derives: equalWith,
})

// Right now ucanto does not yet has native `*` support, which means
// `store/add` can not be derived from `*` event though it can be
// derived from `store/*`. As a workaround we just define base capability
// here so all store capabilities could be derived from either `*` or
// `store/*`.
const base = any.or(upload)

const CARLink = Link.match({ code: codec.code, version: 1 })

/**
 * `store/add` can be derived from the `store/*` capability
 * as long as with fields match.
 */
export const add = base.derive({
  to: capability({
    can: 'upload/add',
    with: URI.match({ protocol: 'did:' }),
    nb: {
      root: CARLink.optional(),
      shards: CARLink.array().optional(),
    },
    derives: (self, from) => {
      return (
        fail(equalWith(self, from)) ||
        fail(equal(self.nb.root, from.nb.root, 'root')) ||
        fail(equal(self.nb.shards, from.nb.shards, 'shards')) ||
        true
      )
    },
  }),
  derives: equalWith,
})

export const remove = base.derive({
  to: capability({
    can: 'upload/remove',
    with: URI.match({ protocol: 'did:' }),
    nb: {
      root: Link.optional(),
    },
    derives: (self, from) => {
      return (
        fail(equalWith(self, from)) ||
        fail(equal(self.nb.root, from.nb.root, 'root')) ||
        true
      )
    },
  }),
  derives: equalWith,
})

export const list = base.derive({
  to: capability({
    can: 'upload/list',
    with: URI.match({ protocol: 'did:' }),
  }),
  derives: equalWith,
})

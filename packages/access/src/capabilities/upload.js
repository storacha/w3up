import { capability, Link, URI } from '@ucanto/server'
import { code as CAR_CODE } from '@ucanto/transport/car/codec'
import { equalWith, List, fail, equal } from './utils.js'
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

const CARLink = Link.match({ code: CAR_CODE, version: 1 })

/**
 * `store/add` can be derived from the `store/*` capability
 * as long as with fields match.
 */
export const add = base.derive({
  to: capability({
    can: 'upload/add',
    with: URI.match({ protocol: 'did:' }),
    caveats: {
      root: Link.optional(),
      shards: List.of(CARLink).optional(),
    },
    derives: (self, from) => {
      return (
        fail(equalWith(self, from)) ||
        fail(equal(self.caveats.root, from.caveats.root, 'root')) ||
        fail(equal(self.caveats.shards, from.caveats.shards, 'shards')) ||
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
    caveats: {
      root: Link.optional(),
    },
    derives: (self, from) => {
      return (
        fail(equalWith(self, from)) ||
        fail(equal(self.caveats.root, from.caveats.root, 'root')) ||
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

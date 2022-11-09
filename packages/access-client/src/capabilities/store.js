import { capability, Failure, Link, URI, Schema } from '@ucanto/validator'
import { equalLink, equalWith } from './utils.js'
import { any } from './any.js'

/**
 * all the `store/*` capabilities which can also be derived
 * from any capability.
 */
export const store = any.derive({
  to: capability({
    can: 'store/*',
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
const base = any.or(store)

/**
 * `store/add` can be derived from the `store/*` capability
 * as long as with fields match.
 */
export const add = base.derive({
  to: capability({
    can: 'store/add',
    with: URI.match({ protocol: 'did:' }),
    nb: {
      link: Link.optional(),
      origin: Link.optional(),
      size: Schema.integer().optional(),
    },
    derives: (claim, from) => {
      const result = equalLink(claim, from)
      if (result.error) {
        return result
      } else if (claim.nb.size !== undefined && from.nb.size !== undefined) {
        return claim.nb.size > from.nb.size
          ? new Failure(
              `Size constraint violation: ${claim.nb.size} > ${from.nb.size}`
            )
          : true
      } else {
        return true
      }
    },
  }),
  derives: equalWith,
})

export const remove = base.derive({
  to: capability({
    can: 'store/remove',
    with: URI.match({ protocol: 'did:' }),
    nb: {
      link: Link.optional(),
    },
    derives: equalLink,
  }),
  derives: equalWith,
})

export const list = base.derive({
  to: capability({
    can: 'store/list',
    with: URI.match({ protocol: 'did:' }),
    derives: (claimed, delegated) => {
      if (claimed.with !== delegated.with) {
        return new Failure(
          `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
        )
      }
      return true
    },
  }),
  derives: equalWith,
})

export const all = add.or(remove).or(list)

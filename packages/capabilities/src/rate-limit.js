/**
 * Rate Limit Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as RateLimit from '@web3-storage/capabilities/rate-limit'
 * ```
 *
 * @module
 */
import { capability, DID, struct, Schema, ok } from '@ucanto/validator'
import { equalWith, and, equal } from './utils.js'

// e.g. did:web:web3.storage or did:web:staging.web3.storage
export const Provider = DID

/**
 * Capability can be invoked by the provider or an authorized delegate to add a rate limit to a subject.
 */
export const add = capability({
  can: 'rate-limit/add',
  with: Provider,
  nb: struct({
    subject: Schema.string(),
    rate: Schema.number(),
  }),
  derives: (child, parent) => {
    return (
      and(equalWith(child, parent)) ||
      and(equal(child.nb.subject, parent.nb.subject, 'subject')) ||
      and(equal(child.nb.rate, parent.nb.rate, 'rate')) ||
      ok({})
    )
  },
})

/**
 * Capability can be invoked by the provider are an authorized delegate to remove rate limits from a subject.
 */
export const remove = capability({
  can: 'rate-limit/remove',
  with: Provider,
  nb: struct({
    id: Schema.string(),
  }),
  derives: (child, parent) => {
    return (
      and(equalWith(child, parent)) ||
      and(equal(child.nb.id, parent.nb.id, 'id')) ||
      ok({})
    )
  },
})

/**
 * Capability can be invoked by the provider or an authorized delegate to list rate limits on the given subject
 */
export const list = capability({
  can: 'rate-limit/list',
  with: Provider,
  nb: struct({
    subject: Schema.string(),
  }),
  derives: (child, parent) => {
    return (
      and(equalWith(child, parent)) ||
      and(equal(child.nb.subject, parent.nb.subject, 'subject')) ||
      ok({})
    )
  },
})

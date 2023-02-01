/**
 * Provider Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Consumer from '@web3-storage/capabilities/consumer'
 * ```
 *
 * @module
 */
import { capability, DID, URI, Link } from '@ucanto/validator'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'
import { equalWith, fail, equal, equalCID } from './utils.js'
import { top } from './top.js'

export { top }

/**
 * Capability can only be delegated (but not invoked) allowing audience to
 * derived any `consumer/` prefixed capability for the agent identified
 * by did:key in the `with` field.
 */
export const consumer = top.derive({
  to: capability({
    can: 'consumer/*',
    with: DID,
    derives: equalWith,
  }),
  derives: equalWith,
})

const base = top.or(consumer)

/**
 * Capability can be invoked by an agent to request a `consumer/add` for an account.
 */
export const add = base.derive({
  to: capability({
    can: 'consumer/add',
    /**
     * Must be an provider DID
     */
    with: DID,
    nb: {
      /**
       * CID for the provider/get invocation
       */
      request: Link,
      /**
       * Support specific space DIDs or undefined to request a provider for multiple spaces
       */
      consumer: URI.match({ protocol: 'did:' }).optional(),
    },
    derives: (child, parent) => {
      return (
        fail(equalWith(child, parent)) ||
        fail(equalCID(child.nb.request, parent.nb.request, 'request')) ||
        fail(equal(child.nb.consumer, parent.nb.consumer, 'consumer')) ||
        true
      )
    },
  }),
  derives: equalWith,
})

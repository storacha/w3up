/**
 * Provider Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Access from '@web3-storage/capabilities/provider'
 * ```
 *
 * @module
 */
import { capability, DID, URI, Link } from '@ucanto/validator'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'
import { equalWith, fail, equal } from './utils.js'
import { top } from './top.js'

export { top }

/**
 * Capability can only be delegated (but not invoked) allowing audience to
 * derived any `provider/` prefixed capability for the agent identified
 * by did:key in the `with` field.
 */
export const provider = top.derive({
  to: capability({
    can: 'access/*',
    with: DID,
    derives: equalWith,
  }),
  derives: equalWith,
})

const base = top.or(provider)

/**
 * Capability can be invoked by an agent to request a `consumer/add` for an account.
 */
export const get = base.derive({
  to: capability({
    can: 'provider/get',
    /**
     * Must be an account DID
     */
    with: DID,
    nb: {
      provider: DID,
      /**
       * Support specific space DIDs or wildcard did:* to request a provider for multiple spaces
       */
      consumer: URI.match({ protocol: 'did:' }),
    },
    derives: (child, parent) => {
      return (
        fail(equalWith(child, parent)) ||
        fail(equal(child.nb.provider, parent.nb.provider, 'provider')) ||
        fail(equal(child.nb.consumer, parent.nb.consumer, 'consumer')) ||
        true
      )
    },
  }),
  derives: equalWith,
})

/**
 * Capability can be invoked by an agent to request a `consumer/add` for an account.
 */
export const consume = base.derive({
  to: capability({
    can: 'provider/consume',
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
       * Support specific space DIDs or wildcard did:* to request a provider for multiple spaces
       */
      consumer: DID.match({ method: 'key' }),
    },
    derives: (child, parent) => {
      return (
        fail(equalWith(child, parent)) ||
        fail(equal(child.nb.request, parent.nb.request, 'request')) ||
        fail(equal(child.nb.consumer, parent.nb.consumer, 'consumer')) ||
        true
      )
    },
  }),
  derives: equalWith,
})

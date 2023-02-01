/**
 * Provider Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Provider from '@web3-storage/capabilities/provider'
 * ```
 *
 * @module
 */
import { capability, DID, URI } from '@ucanto/validator'
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
    can: 'provider/*',
    with: DID,
    derives: equalWith,
  }),
  derives: equalWith,
})

const base = top.or(provider)

/**
 * Capability can be invoked by an agent to request a `consumer/add` for a space.
 */
export const get = base.derive({
  to: capability({
    can: 'provider/get',
    with: DID,
    nb: {
      provider: DID,
      /**
       * Support specific space DIDs or undefined to request a provider for multiple spaces
       */
      consumer: URI.match({ protocol: 'did:' }).optional(),
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
 * Capability can be invoked by an agent to add a provider to a space.
 */
export const add = base.derive({
  to: capability({
    can: 'provider/add',
    with: DID,
    nb: {
      provider: DID,
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

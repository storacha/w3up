/**
 * Account Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Account from '@web3-storage/access/capabilities/account'
 * ```
 *
 * @module
 */

import { any } from './wildcard.js'
import { store } from './store.js'
import { capability, URI } from '@ucanto/validator'
import { canDelegateURI, equalWith, fail } from './utils.js'

export const account = any.derive({
  to: capability({
    can: 'account/*',
    with: URI.match({ protocol: 'did:' }),
    derives: equalWith,
  }),
  derives: equalWith,
})

const base = any.or(account)

/**
 * `account/info` can be derived from any of the `store/*`
 * capability that has matching `with`. This allows store service
 * to identify account based on any user request.
 */
export const info = base.or(store).derive({
  to: capability({
    can: 'account/info',
    with: URI.match({ protocol: 'did:' }),
    derives: equalWith,
  }),
  derives: equalWith,
})

export const recoverValidation = base.derive({
  to: capability({
    can: 'account/recover-validation',
    with: URI.match({ protocol: 'did:' }),
    nb: {
      identity: URI.match({ protocol: 'mailto:' }),
    },
    derives: equalWith,
  }),
  derives: equalWith,
})

export const recover = base.derive({
  to: capability({
    can: 'account/recover',
    with: URI.match({ protocol: 'did:' }),
    nb: {
      identity: URI.match({ protocol: 'mailto:' }),
    },
    derives: (child, parent) => {
      return (
        fail(equalWith(child, parent)) ||
        fail(canDelegateURI(child.nb.identity, parent.nb.identity)) ||
        true
      )
    },
  }),
  derives: equalWith,
})

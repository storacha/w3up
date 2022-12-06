/**
 * Space Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Space from '@web3-storage/capabilities/space'
 * ```
 *
 * @module
 */

import { top } from './top.js'
import * as Store from './store.js'
import { capability, URI } from '@ucanto/validator'
import { canDelegateURI, equalWith, fail } from './utils.js'
import * as Upload from './upload.js'

export { top } from './top.js'

export const space = top.derive({
  to: capability({
    can: 'space/*',
    with: URI.match({ protocol: 'did:' }),
    derives: equalWith,
  }),
  derives: equalWith,
})

const base = top.or(space)

/**
 * `space/info` can be derived from any of the `store/*`
 * capability that has matching `with`. This allows store service
 * to identify account based on any user request.
 */
export const info = base
  .or(Store.add)
  .or(Store.list)
  .or(Store.remove)
  .or(Upload.add)
  .or(Upload.list)
  .or(Upload.remove)
  .derive({
    to: capability({
      can: 'space/info',
      with: URI.match({ protocol: 'did:' }),
      derives: equalWith,
    }),
    derives: equalWith,
  })

export const recoverValidation = base.derive({
  to: capability({
    can: 'space/recover-validation',
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
    can: 'space/recover',
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

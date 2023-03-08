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

import * as Store from './store.js'
import { capability, URI, Schema } from '@ucanto/validator'
import { canDelegateURI, equalWith, fail } from './utils.js'
import * as Upload from './upload.js'
export { top } from './top.js'

// Need this to workaround TS bug
// @see https://github.com/microsoft/TypeScript/issues/51548
export { Store }

export const space = capability({
  can: 'space/*',
  with: URI.match({ protocol: 'did:' }),
  derives: equalWith,
})

/**
 * `space/info` can be derived from any of the `store/*`
 * capability that has matching `with`. This allows store service
 * to identify account based on any user request.
 */
export const info = Store.add
  .or(Store.list)
  .or(Store.remove)
  .or(Upload.add)
  .or(Upload.list)
  .or(Upload.remove)
  .derive({
    to: capability({
      can: 'space/info',
      with: URI.match({ protocol: 'did:' }),
    }),
    derives: equalWith,
  })

export const recoverValidation = capability({
  can: 'space/recover-validation',
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    identity: URI.match({ protocol: 'mailto:' }),
  }),
})

export const recover = capability({
  can: 'space/recover',
  with: URI.match({ protocol: 'did:' }),
  nb: Schema.struct({
    identity: URI.match({ protocol: 'mailto:' }),
  }),
  derives: (child, parent) => {
    return (
      fail(equalWith(child, parent)) ||
      fail(canDelegateURI(child.nb.identity, parent.nb.identity)) ||
      true
    )
  },
})

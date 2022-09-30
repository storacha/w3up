import { capability, URI } from '@ucanto/server'
import { store } from './store.js'
import { equalWith } from './utils.js'

export const all = capability({
  can: 'account/*',
  with: URI.match({ protocol: 'did:' }),
  derives: equalWith,
})

/**
 * `account/info` can be derived from any of the `store/*`
 * capability that has matichng `with`. This allows store service
 * to identify account based on any user request.
 */
export const info = all.or(store).derive({
  to: capability({
    can: 'account/info',
    with: URI.match({ protocol: 'did:' }),
    derives: equalWith,
  }),
  derives: equalWith,
})
export const account = info

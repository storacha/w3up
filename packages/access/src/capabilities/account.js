import { capability, URI } from '@ucanto/server'
import { any } from './any.js'
import { store } from './store.js'
import { equalWith } from './utils.js'

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

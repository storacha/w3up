import { capability, URI } from '@ucanto/validator'
import * as Store from './store.js'
import { canDelegateURI, equalWith } from './utils.js'

export const validate = capability({
  can: 'identity/validate',
  with: URI.match({ protocol: 'did:' }),
  nb: {
    as: URI.match({ protocol: 'mailto:' }),
  },
  derives: (child, parent) => {
    return canDelegateURI(child.nb.as, parent.nb.as) && equalWith(child, parent)
  },
})

export const register = capability({
  can: 'identity/register',
  with: URI.match({ protocol: 'mailto:' }),
  nb: {
    as: URI.match({ protocol: 'did:' }),
  },
  derives: (child, parent) =>
    canDelegateURI(child.nb.as, parent.nb.as) &&
    canDelegateURI(child.with, parent.with),
})

/**
 * `identity/identify` can be derived from any of the `store/*`
 * capability that has matichng `with`. This allows store service
 * to identify account based on any user request.
 */
export const identify = Store.all.derive({
  to: capability({
    can: 'identity/identify',
    with: URI.match({ protocol: 'did:' }),
    derives: equalWith,
  }),
  derives: equalWith,
})

export const identity = register.or(validate).or(identify)

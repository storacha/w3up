import { capability, URI } from '@ucanto/server'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import { store } from './store.js'
import { canDelegateURI, equalWith } from './utils.js'

export const validate = capability({
  can: 'identity/validate',
  with: URI.match({ protocol: 'did:' }),
  caveats: {
    as: URI.string({ protocol: 'mailto:' }),
  },
  derives: (child, parent) => {
    return (
      canDelegateURI(child.caveats.as, parent.caveats.as) &&
      equalWith(child, parent)
    )
  },
})

export const register = capability({
  can: 'identity/register',
  with: URI.match({ protocol: 'mailto:' }),
  caveats: {
    as: URI.string({ protocol: 'did:' }),
  },
  derives: (child, parent) =>
    canDelegateURI(child.caveats.as, parent.caveats.as) &&
    canDelegateURI(child.with, parent.with),
})

/**
 * `identity/identify` can be derived from any of the `store/*`
 * capability that has matichng `with`. This allows store service
 * to identify account based on any user request.
 */
export const identify = store.derive({
  to: capability({
    can: 'identity/identify',
    with: URI.match({ protocol: 'did:' }),
    derives: equalWith,
  }),
  derives: equalWith,
})
export const identity = register.or(validate).or(identify)

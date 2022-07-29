import { Link, Failure, capability, URI } from '@ucanto/server'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'
import { canDelegateURI, derives, equalWith } from './capabilities-utils.js'

export const storeAdd = capability({
  can: 'store/add',
  with: URI.match({ protocol: 'did:' }),
  caveats: {
    link: Link.optional(),
  },
  derives,
})

export const storeRemove = capability({
  can: 'store/remove',
  with: URI.match({ protocol: 'did:' }),
  caveats: {
    link: Link.optional(),
  },
  derives,
})

export const storeList = capability({
  can: 'store/list',
  with: URI.match({ protocol: 'did:' }),
  derives: (claimed, delegated) => {
    if (claimed.uri.href !== delegated.uri.href) {
      return new Failure(
        `Expected 'with: "${delegated.uri.href}"' instead got '${claimed.uri.href}'`
      )
    }
    return true
  },
})

export const store = storeAdd.or(storeRemove).or(storeList)

export const identityValidate = capability({
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

export const identityRegister = capability({
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
export const identityIdentify = store.derive({
  to: capability({
    can: 'identity/identify',
    with: URI.match({ protocol: 'did:' }),
    derives: equalWith,
  }),
  derives: equalWith,
})

export const identity = identityRegister
  .or(identityValidate)
  .or(identityIdentify)

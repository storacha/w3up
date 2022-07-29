import { capability, Failure, URI } from '@ucanto/validator'
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'

/**
 * Check URI can be delegated
 *
 * @param {string} child
 * @param {string} parent
 */
const canDelegateURI = (child, parent) => {
  if (parent.endsWith('*')) {
    return child.startsWith(parent.slice(0, -1))
      ? true
      : new Failure(`${child} does not match ${parent}`)
  }

  return child === parent
    ? true
    : new Failure(`${child} is different from ${parent}`)
}

/**
 * Checks that `with` on claimed capability is the same as `with`
 * in delegated capability. Note this will ignore `can` field.
 *
 * @param {Types.ParsedCapability} child
 * @param {Types.ParsedCapability} parent
 */
function equalWith(child, parent) {
  return (
    child.with === parent.with ||
    new Failure(
      `Can not derive ${child.can} with ${child.with} from ${parent.with}`
    )
  )
}

/**
 * @typedef {import('@ucanto/interface').Capability<"identity/validate", `did:${string}`> & { as: `mailto:${string}`}} IdentityValidate
 */

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

/**
 * @typedef {import('@ucanto/interface').Capability<"identity/register", `mailto:${string}`> & { as: `did:${string}`}} IdentityRegister
 */

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
export const identityIdentify = capability({
  can: 'identity/identify',
  with: URI.match({ protocol: 'did:' }),
  derives: equalWith,
})

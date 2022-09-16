import * as Server from '@ucanto/server'
import { capability, URI, Failure } from '@ucanto/server'
import * as API from '../type.js'
import * as Store from '../store/capability.js'

/**
 * Checks that `with` on claimed capability is the same as `with`
 * in delegated capability. Note this will ignore `can` field.
 *
 * @template {Server.ParsedCapability<API.Ability>} T
 * @template {Server.ParsedCapability<API.Ability>} U
 * @param {T} claimed
 * @param {U} delegated
 */
const equalWith = (claimed, delegated) =>
  claimed.uri.href === delegated.uri.href ||
  new Failure(
    `Can not derive ${claimed.can} with ${claimed.uri.href} from ${delegated.uri.href}`
  )

/**
 * @param {string} claimed
 * @param {string} delegated
 */
const derivesURIPattern = (claimed, delegated) => {
  if (delegated.endsWith('*')) {
    if (claimed.startsWith(delegated.slice(0, -1))) {
      return true
    } else {
      return new Failure(`${claimed} does not match ${delegated}`)
    }
  }

  if (claimed === delegated) {
    return true
  } else {
    return new Failure(`${claimed} is differnt from ${delegated}`)
  }
}

export const Validate = capability({
  can: 'identity/validate',
  with: URI.match({ protocol: 'did:' }),
  caveats: {
    as: URI.string({ protocol: 'mailto:' }),
  },
  derives: (claimed, delegated) =>
    derivesURIPattern(claimed.caveats.as, delegated.caveats.as) &&
    equalWith(claimed, delegated),
})

export const Register = capability({
  can: 'identity/register',
  with: URI.match({ protocol: 'mailto:' }),
  caveats: {
    as: URI.string({ protocol: 'did:' }),
  },
  derives: (claimed, delegated) =>
    derivesURIPattern(claimed.caveats.as, delegated.caveats.as) &&
    derivesURIPattern(claimed.with, delegated.with),
})

export const Link = capability({
  can: 'identity/link',
  with: URI.match({ protocol: 'did:' }),
  caveats: {
    as: URI.string({ protocol: 'did:' }),
  },
  derives: equalWith,
})

/**
 * `identity/identify` can be derived from any of the `store/*`
 * capability that has matichng `with`. This allows store service
 * to identify account based on any user request.
 */
export const Identify = Store.Capability.derive({
  to: capability({
    can: 'identity/identify',
    with: URI.match({ protocol: 'did:' }),
    derives: equalWith,
  }),
  derives: equalWith,
})

/**
 * Represents `identity/*` capability.
 */
export const Capability = Register.or(Link).or(Identify)

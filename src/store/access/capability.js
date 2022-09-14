import { URI, capability } from '@ucanto/validator'

import * as Store from '../store/capability.js'
import { derivesURIPattern, equalWith } from '../validation.js'

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
 * capability that has matching `with`. This allows store service
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

import { DID, Schema, capability, ok, struct } from '@ucanto/validator'
import { AccountDID, equal, equalWith, and } from './utils.js'

/**
 * Capability can be invoked by an account to get information about
 * the plan it is currently signed up for.
 */
export const get = capability({
  can: 'plan/get',
  with: AccountDID,
  derives: (child, parent) => {
    return and(equalWith(child, parent)) || ok({})
  },
})

/**
 * Capability can be invoked by an account to change its billing plan.
 */
export const set = capability({
  can: 'plan/set',
  with: AccountDID,
  nb: struct({
    product: DID,
  }),
  derives: (child, parent) => {
    return (
      and(equalWith(child, parent)) ||
      and(equal(child.nb.product, parent.nb.product, 'product')) ||
      ok({})
    )
  },
})

/**
 * Capability can be invoked by an account to change its billing email.
 */
export const setEmail = capability({
  can: 'plan/set-email',
  with: AccountDID,
  nb: struct({
    email: Schema.string()
  }),
  derives: (child, parent) => {
    return (
      and(equalWith(child, parent)) ||
      and(equal(child.nb.email, parent.nb.email, 'email')) ||
      ok({})
    )
  },
})

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
 * Capability can be invoked by an account to generate a billing admin session.
 *
 * May not be possible with all billing providers - this is designed with
 * https://docs.stripe.com/api/customer_portal/sessions/create in mind.
 */
export const createAdminSession = capability({
  can: 'plan/create-admin-session',
  with: AccountDID,
  nb: struct({
    returnURL: Schema.string(),
  }),
  derives: (child, parent) => {
    return (
      and(equalWith(child, parent)) ||
      and(equal(child.nb.returnURL, parent.nb.returnURL, 'returnURL')) ||
      ok({})
    )
  },
})

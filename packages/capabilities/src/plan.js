import { DID, capability, ok, struct } from '@ucanto/validator'
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
export const update = capability({
  can: 'plan/update',
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

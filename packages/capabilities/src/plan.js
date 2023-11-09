import { capability, ok } from '@ucanto/validator'
import { AccountDID, equalWith, and } from './utils.js'

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

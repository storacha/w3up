import { capability, DID, ok } from '@ucanto/validator'
import { equalWith, and } from './utils.js'

export const AccountDID = DID.match({ method: 'mailto' })

/**
 * Capability can be invoked by an account to get information about
 * the plan it is currently signed up for.
 */
export const get = capability({
  can: 'plan/get',
  with: AccountDID,
  derives: (child, parent) => {
    return (
      and(equalWith(child, parent)) ||
      ok({})
    )
  },
})

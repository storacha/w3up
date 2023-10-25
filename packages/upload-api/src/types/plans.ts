import * as Ucanto from '@ucanto/interface'
import { AccountDID, DID, PlanGetFailure, PlanGetSuccess } from '../types.js'

export type PlanID = DID

/**
 * Stores subscription plan information.
 */
export interface PlansStorage {
  /**
   * Get plan information for an account
   *
   * @param account account DID
   */
  get: (
    account: AccountDID
  ) => Promise<Ucanto.Result<PlanGetSuccess, PlanGetFailure>>

  /**
   * Set an account's plan
   *
   * @param account account DID
   */
  set: (
    account: AccountDID,
    plan: DID
  ) => Promise<Ucanto.Result<Ucanto.Unit, Ucanto.Failure>>
}

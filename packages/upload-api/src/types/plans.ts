import * as Ucanto from '@ucanto/interface'
import { AccountDID, DID, PlanGetFailure, PlanGetSuccess, PlanUpdateFailure, PlanUpdateSuccess } from '../types.js'

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
   * Set an account's plan in our systems.
   * 
   * This should only update our systems, ie in a case where we have been notified
   * that a user's plan has been updated in the third party billing system.
   *
   * @param account account DID
   * @param plan the DID of the new plan
   */
  set: (
    account: AccountDID,
    plan: DID
  ) => Promise<Ucanto.Result<Ucanto.Unit, Ucanto.Failure>>

  /**
   * Update an account's plan in the billing system.
   * 
   * This should be used when a user manually updates their plan, and should
   * update the plan value in both our systems and any third party billing systems.
   *
   * @param account account DID
   * @param plan the DID of the new plan
   */
  update: (
    account: AccountDID,
    plan: DID
  ) => Promise<Ucanto.Result<PlanUpdateSuccess, PlanUpdateFailure>>
}

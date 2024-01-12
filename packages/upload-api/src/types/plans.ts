import * as Ucanto from '@ucanto/interface'
import { AccountDID, DID, PlanGetFailure, PlanGetSuccess, PlanSetFailure, PlanSetSuccess } from '../types.js'

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
   * Set an account's plan. Update our systems and any third party billing systems.
   *
   * @param account account DID
   * @param plan the DID of the new plan
   */
  set: (
    account: AccountDID,
    plan: DID
  ) => Promise<Ucanto.Result<PlanSetSuccess, PlanSetFailure>>
}

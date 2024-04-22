import * as Ucanto from '@ucanto/interface'
import {
  AccountDID,
  DID,
  PlanGetFailure,
  PlanGetSuccess,
  PlanSetFailure,
  PlanSetSuccess,
  PlanSetEmailFailure,
  PlanSetEmailSuccess,
  UnexpectedError,
} from '../types.js'

export type PlanID = DID

export interface CustomerExists extends Ucanto.Failure {
  name: 'CustomerExists'
}

type PlanInitializeFailure = CustomerExists | UnexpectedError

/**
 * Stores subscription plan information.
 */
export interface PlansStorage {
  /**
   * Initialize a customer in our system, tracking the external billing
   * system ID and the plan they have chosen.
   *
   * Designed to be use from, eg, a webhook handler for an account creation event
   * in a third party billing system.
   *
   * @param account account DID
   * @param billingID ID used by billing system to track this account
   * @param plan the ID of the initial plan
   */
  initialize: (
    account: AccountDID,
    billingID: string,
    plan: PlanID
  ) => Promise<Ucanto.Result<Ucanto.Unit, PlanInitializeFailure>>

  /**
   * Get plan information for a customer
   *
   * @param account account DID
   */
  get: (
    account: AccountDID
  ) => Promise<Ucanto.Result<PlanGetSuccess, PlanGetFailure>>

  /**
   * Set a customer's plan. Update our systems and any third party billing systems.
   *
   * @param account account DID
   * @param plan the ID of the new plan
   */
  set: (
    account: AccountDID,
    plan: PlanID
  ) => Promise<Ucanto.Result<PlanSetSuccess, PlanSetFailure>>

    /**
   * Set a customer's billing email. Update our systems and any third party billing systems.
   *
   * @param account account DID
   * @param email the new billing email
   */
    setEmail: (
      account: AccountDID,
      email: string
    ) => Promise<Ucanto.Result<PlanSetEmailSuccess, PlanSetEmailFailure>>
}

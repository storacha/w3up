import type { Capability, DID, ServiceMethod, Failure } from '@ucanto/interface'
import type { ProductLink } from 'w3-product'

type AccountDID = DID
type AgentDID = DID
type ServiceDID = DID
type ProductID = string

type MailtoURI = `mailto:${string}`

type VerifiableID = MailtoURI

export interface Claim
  extends Capability<'voucher/claim', AccountDID | AgentDID> {
  /**
   * ID of the product / feature the voucher is for
   */
  of: ProductLink

  /**
   * URL that corresponds to the verifiable identity submitting a claim
   */
  by: VerifiableID

  /**
   * DID of the service they wish to redeem voucher with
   */
  at: ServiceDID
}

/**
 * Can be invoked to redeem voucher. These are always issued by the service
 */
export interface Redeem extends Capability<'voucher/redeem', ServiceDID> {
  /**
   * ID of the product / feature the voucher is for
   */
  id: ProductID

  /**
   * URL that corresponds to the verifiable identity submitting a claim
   */
  by: VerifiableID

  /**
   * An account to enable voucher feature(s) on.
   */
  on: AccountDID
}

export interface Voucher {
  claim: ServiceMethod<Claim, Redeem, ClaimError>
  redeem: ServiceMethod<Redeem, null, RedeemError>
}

export type ClaimError = ProductError | IdentityError | AccountError

export type RedeemError =
  | ProductError
  | IdentityError
  | AccountError
  | VoucherError

export type VoucherError = VoucherWasAlreadyRedeemed | VoucherDoesNotApply

export type ProductError = DiscontinuedProduct | UnknownProduct

export type AccountError = InvalidAccount

export type IdentityError = InvalidIdentity | UnsupportedIdentity

/**
 * Service may no longer carry vouchers for the products because they got
 * discontinued. In such case this error is returned.
 */
export interface DiscontinuedProduct extends Failure {
  name: 'DiscontinuedProduct'
}

/**
 * Service may not have vouchers to the claimed product. In that instance
 * service will produce this error.
 */
export interface UnknownProduct extends Failure {
  name: 'UnknownProduct'
}

/**
 * Error is returned when account is malformed
 */
export interface InvalidAccount extends Failure {
  name: 'InvalidAccount'
}

/**
 * Error is returned if provided identity is malformed or is invalid in some
 * ways.
 */
export interface InvalidIdentity extends Failure {
  name: 'InvalidIdentity'
}

/**
 * Error is returned if provided identity is invalid.
 */
export interface UnsupportedIdentity extends Failure {
  name: 'UnsupportedIdentity'
}

/**
 * Service will return this error if voucher for the same product
 * and by same identity was already redeemed.
 *
 * @see https://hackmd.io/@gozala/w3-accounts#voucher-can-be-used-once
 */
export interface VoucherWasAlreadyRedeemed extends Failure {
  name: 'VoucherWasAlreadyRedeemed'
}

/**
 * Service will return this error if voucher for the specified product
 * can not be applied to the specificed account, which may happen e.g. when
 * product is the feature that is already enabled on this account. It also may
 * be that account has conflicting product installed.
 *
 * @see https://hackmd.io/@gozala/w3-accounts#voucher-enables-feature
 */

export interface VoucherDoesNotApply extends Failure {
  name: 'AccountAlreadyContainsVoucher'
}

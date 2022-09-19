import type { Capability, DID, ServiceMethod } from '@ucanto/server'
import type { Failure } from '@ucanto/interface'
import type { ProductLink } from 'w3-product'

type AccountDID = DID

export interface Buy extends Capability<'account/buy', AccountDID> {
  product: ProductLink
}

export interface Account {
  buy: ServiceMethod<Buy, null, BuyError>
}

export type BuyError = PaymentFailed | PaymentNotInstalled

/**
 * Error in processing a payment
 */
export interface PaymentFailed extends Failure {}

/**
 * Account has not payments installed to complete the payment.
 */
export interface PaymentNotInstalled extends Failure {}

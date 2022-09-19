import type {
  Failure,
  Capability,
  DID,
  ServiceMethod,
  Link,
  ByteView,
} from '@ucanto/interface'
import * as CBOR from '@ucanto/transport/cbor/codec'

type AccountDID = DID
type ServiceDID = DID
type ProductID = string

type MailtoURI = `mailto:${string}`

type VerifiableID = MailtoURI

type PaymentID = string

export interface Install extends Capability<'payment/install', AccountDID> {
  /**
   * Agent derives shared secret key using Diffie–Hellman key exchange algorithm
   * where token `iss` private key and `aud` public key are used (new temporary
   * agent may be generated for this invocation to ensure that `iss` uses same
   * key algorithm as `aud`). Agent that generates a cryptographically random
   * secret key and encrypts it with a shared secret key. Result is stored in
   * cypher field which is indented to enable `aud` decrypt a `data` field.
   *
   * @see https://en.wikipedia.org/wiki/Diffie%E2%80%93Hellman_key_exchange
   */
  cypher: Cypher<EncryptionKey, SharedSecret>
  data: Link<Cypher<ByteView<SetupPayment>, this['cypher']>, typeof CBOR.code>
}

/**
 * Invoked this capability will uinstall payment method from the account.
 * Paymeth method will no longer be listed under account and no more changes
 * will be applied to it.
 *
 * TODO: Answer following questions:
 *
 * 1. What happens with charges for this billing cycle, do we still charge them
 * or do we try to collect those differently.
 * 2. What happens with a subscriptions that were purchased with this account ?
 * We could either switch those to other payment method (if one exists on
 * account) or we just terminate those.
 */
export interface Uninstall extends Capability<'payment/uninstall', AccountDID> {
  id: PaymentID
}

/**
 * Invoking this capability will provide a list of payment methods installed.
 */
export interface Status extends Capability<'payment/status', AccountDID> {}

export interface Payment {
  install: ServiceMethod<Install, null, InstallError>
  uninstall: ServiceMethod<Uninstall, null, UninstallError>
  status: ServiceMethod<Status, PaymentStatus, StatusError>
}

// TODO: Define actual errors that can occur.
export type InstallError = Failure
export type StatusError = Failure
export type UninstallError = UnknownPaymethMethod

interface PaymentStatus {
  account: AccountDID
  installed: InstalledPaymentMethod[]
}

export interface InstalledPaymentMethod {
  id: PaymentID
  default: boolean
}

export type UnknownPaymethMethod = Failure

/**
 * This is roughly corresponds to parameters passed to stripes
 * Create a PaymentMethod.
 *
 * @see https://stripe.com/docs/api/payment_methods/create
 */
export type SetupPayment = SetupCardPayment

export interface SetupCardPayment {
  type: 'card'
  number: string
  exp_month: number
  exp_year: number
  cvc: string
}

type EncryptionKey = Uint8Array

interface Cypher<
  Data extends Uint8Array = Uint8Array,
  Key extends Uint8Array = Uint8Array
> extends ByteView<{
    algorithm: string
    key: Key
    data: Data
  }> {}

interface SharedSecret<
  PrivateKey extends Uint8Array = Uint8Array,
  PublicKey extends Uint8Array = Uint8Array
> extends ByteView<[PrivateKey, PublicKey]> {}

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

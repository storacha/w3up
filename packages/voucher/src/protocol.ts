import type { Capability, DID } from '@ucanto/server'

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
  id: ProductID

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

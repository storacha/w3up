import type { Capability, IPLDLink, DID } from '@ipld/dag-ucan'

type AccountDID = DID
type AgentDID = DID
type ServiceDID = DID

// Voucher Protocol
export interface VoucherClaim
  extends Capability<'voucher/claim', AccountDID | AgentDID> {
  /**
   * Product ID/CID
   */
  product: `${string}:${string}`

  /**
   * URI for an identity to be validated
   */
  identity: `${string}:${string}`

  /**
   * DID of the service they wish to redeem voucher with
   */
  service: DID
}

/**
 * Can be invoked to redeem voucher. These are always issued by the service
 */
export interface VoucherRedeem
  extends Capability<'voucher/redeem', ServiceDID> {
  product: `${string}:${string}`
  identity: `${string}:${string}`
  account: AccountDID
}

// Identity
export interface IdentityValidate extends Capability<'identity/validate', DID> {
  as: `mailto:${string}`
}

export interface IdentityRegister
  extends Capability<'identity/register', `mailto:${string}`> {
  as: DID
}

export interface IdentityIdentify
  extends Capability<'identity/identify', DID> {}

// Store
export interface StoreAdd extends Capability<'store/add', DID> {
  link?: IPLDLink
}

export interface StoreRemove extends Capability<'store/remove', DID> {
  link?: IPLDLink
}

export interface StoreList extends Capability<'store/list', DID> {}

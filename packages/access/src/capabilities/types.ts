import type { Capability, IPLDLink, DID, ToString } from '@ipld/dag-ucan'
import type { Block as IPLDBlock } from '@ucanto/interface'
import { code as CAR_CODE } from '@ucanto/transport/car/codec'

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

/**
 * Logical represenatation of the CAR.
 */
export interface CAR {
  roots: IPLDLink[]
  blocks: Map<ToString<IPLDLink>, IPLDBlock>
}

export type CARLink = IPLDLink<CAR, typeof CAR_CODE>

/**
 * Capability to add arbitrary CID into an account's upload listing.
 */
export interface UploadAdd extends Capability<'upload/add', AccountDID> {
  /**
   * CID of the file / directory / DAG root that is uploaded.
   */
  root: IPLDLink
  /**
   * List of CAR links which MAY contain contents of this upload. Please
   * note that there is no guarantee that linked CARs actually contain
   * content related to this upload, it is whatever user deemed semantically
   * relevant.
   */
  shards: CARLink[]
}

/**
 * Capability to list CIDs in the account's upload list.
 */
export interface UploadList extends Capability<'upload/list', AccountDID> {
  // ⚠️ We will likely add more fields here to support paging etc... but that
  // will come in the future.
}

/**
 * Capability to remove arbitrary CID from the account's upload list.
 */
export interface UploadRemove extends Capability<'upload/remove', AccountDID> {
  /**
   * CID of the file / directory / DAG root to be removed from the upload list.
   */
  root: IPLDLink
}

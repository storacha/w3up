import { InferInvokedCapability } from '@ucanto/interface'
import { all, info } from './account.js'
import { identify, register, validate } from './identity.js'
import { add, list, remove } from './store.js'
import { claim, redeem } from './voucher.js'

// Account
export type AccountInfo = InferInvokedCapability<typeof info>
export type AccountAll = InferInvokedCapability<typeof all>
// Voucher Protocol
export type VoucherRedeem = InferInvokedCapability<typeof redeem>
export type VoucherClaim = InferInvokedCapability<typeof claim>
// Identity
export type IdentityValidate = InferInvokedCapability<typeof validate>
export type IdentityRegister = InferInvokedCapability<typeof register>
export type IdentityIdentify = InferInvokedCapability<typeof identify>

// Identity
export interface IdentityValidate1
  extends Capability<'identity/validate', `did:${string}`, { as: string }> {
  nb: { as: string }
}

export interface IdentityRegister1
  extends Capability<
    'identity/register',
    `${string}:${string}`,
    { as: `did:${string}` }
  > {
  nb: { as: `did:${string}` }
}

export interface IdentityIdentify1
  extends Capability<'identity/identify', `did:${string}`, {}> {}

export type integer = number & Phantom<{ kind: 'integer' }>

/**
 * Logical represenatation of the CAR.
 */
export interface CAR {
  roots: IPLDLink[]
  blocks: Map<ToString<IPLDLink>, IPLDBlock>
}

export type CARLink = IPLDLink<CAR, typeof CARCodec.code>

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
// Store
export type StoreAdd = InferInvokedCapability<typeof add>
export type StoreRemove = InferInvokedCapability<typeof remove>
export type StoreList = InferInvokedCapability<typeof list>

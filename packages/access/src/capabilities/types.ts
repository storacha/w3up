import type { IPLDLink, Capability } from '@ipld/dag-ucan'
import { InferInvokedCapability } from '@ucanto/interface'
import { identify, register, validate } from './identity.js'
import { claim, redeem } from './voucher.js'

// Voucher Protocol
export interface VoucherClaim1
  extends Capability<
    'voucher/claim',
    `did:${string}`,
    {
      /**
       * Product ID/CID
       */
      product: string

      /**
       * URI for an identity to be validated
       */
      identity: string

      /**
       * DID of the service they wish to redeem voucher with
       */
      service: `did:${string}`
    }
  > {}

/**
 * Can be invoked to redeem voucher. These are always issued by the service
 */
interface VoucherRedeemNB {
  product: string
  identity: string
  account: `did:${string}`
}
export interface VoucherRedeem1
  extends Capability<'voucher/redeem', `did:${string}`, VoucherRedeemNB> {
  // nb: VoucherRedeemNB
}

// export type Capability<
//   Can extends Ability = Ability,
//   With extends Resource = Resource,
//   Caveats extends unknown = unknown
// > = {
//   with: With
//   can: Can
//   // nb?: Caveats
// } & (keyof Caveats extends never
//   ? { nb?: { [key: string]: never } }
//   : { nb: Caveats })

// type InferCapability<T extends TheCapabilityParser<any>> =
//   T extends TheCapabilityParser<infer M>
//     ? Required<
//         Capability<M['value']['can'], M['value']['with'], M['value']['nb']>
//       >
//     : never

export type VoucherRedeem = InferInvokedCapability<typeof redeem>
export type VoucherClaim = InferInvokedCapability<typeof claim>
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

// Store
export interface StoreAdd
  extends Capability<'store/add', `did:${string}`, { link?: IPLDLink }> {
  nb: { link?: IPLDLink }
}

export interface StoreRemove
  extends Capability<'store/remove', `did:${string}`, { link?: IPLDLink }> {
  nb: { link?: IPLDLink }
}

export interface StoreList
  extends Capability<'store/list', `did:${string}`, {}> {}

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

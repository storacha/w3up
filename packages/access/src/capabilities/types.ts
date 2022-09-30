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

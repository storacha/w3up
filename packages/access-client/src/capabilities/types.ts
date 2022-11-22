import { InferInvokedCapability } from '@ucanto/interface'
import { space, info, recover, recoverValidation } from './space.js'
import { top } from './top.js'
import { add, list, remove, store } from './store.js'
import * as UploadCaps from './upload.js'
import { claim, redeem } from './voucher.js'

// Space
export type Space = InferInvokedCapability<typeof space>
export type SpaceInfo = InferInvokedCapability<typeof info>
export type SpaceRecoverValidation = InferInvokedCapability<
  typeof recoverValidation
>
export type SpaceRecover = InferInvokedCapability<typeof recover>

// Voucher Protocol
export type VoucherRedeem = InferInvokedCapability<typeof redeem>
export type VoucherClaim = InferInvokedCapability<typeof claim>
// Upload
export type Upload = InferInvokedCapability<typeof UploadCaps.upload>
export type UploadAdd = InferInvokedCapability<typeof UploadCaps.add>
export type UploadRemove = InferInvokedCapability<typeof UploadCaps.remove>
export type UploadList = InferInvokedCapability<typeof UploadCaps.list>
// Store
export type Store = InferInvokedCapability<typeof store>
export type StoreAdd = InferInvokedCapability<typeof add>
export type StoreRemove = InferInvokedCapability<typeof remove>
export type StoreList = InferInvokedCapability<typeof list>
// Top
export type Top = InferInvokedCapability<typeof top>

export type Abilities =
  | Space['can']
  | SpaceInfo['can']
  | SpaceRecover['can']
  | SpaceRecoverValidation['can']
  | VoucherClaim['can']
  | VoucherRedeem['can']
  | Upload['can']
  | UploadAdd['can']
  | UploadRemove['can']
  | UploadList['can']
  | Store['can']
  | StoreAdd['can']
  | StoreRemove['can']
  | StoreList['can']
  | Top['can']

import { InferInvokedCapability } from '@ucanto/interface'
import { account, info, recover, recoverValidation } from './account.js'
import { any } from './wildcard.js'
import { add, list, remove } from './store.js'
import * as UploadCaps from './upload.js'
import { claim, redeem } from './voucher.js'

// Account
export type Account = InferInvokedCapability<typeof account>
export type AccountInfo = InferInvokedCapability<typeof info>
export type AccountRecoverValidation = InferInvokedCapability<
  typeof recoverValidation
>
export type AccountRecover = InferInvokedCapability<typeof recover>
// Voucher Protocol
export type VoucherRedeem = InferInvokedCapability<typeof redeem>
export type VoucherClaim = InferInvokedCapability<typeof claim>
// Upload
export type Upload = InferInvokedCapability<typeof UploadCaps.upload>
export type UploadAdd = InferInvokedCapability<typeof UploadCaps.add>
export type UploadRemove = InferInvokedCapability<typeof UploadCaps.remove>
export type UploadList = InferInvokedCapability<typeof UploadCaps.list>
// Store
export type StoreAdd = InferInvokedCapability<typeof add>
export type StoreRemove = InferInvokedCapability<typeof remove>
export type StoreList = InferInvokedCapability<typeof list>
// Any
export type Any = InferInvokedCapability<typeof any>

export type Abilities =
  | Account['can']
  | AccountInfo['can']
  | AccountRecover['can']
  | AccountRecoverValidation['can']
  | VoucherClaim['can']
  | VoucherRedeem['can']
  | Upload['can']
  | UploadAdd['can']
  | UploadRemove['can']
  | UploadList['can']
  | StoreAdd['can']
  | StoreRemove['can']
  | StoreList['can']
  | Any['can']

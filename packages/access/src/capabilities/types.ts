import { InferInvokedCapability } from '@ucanto/interface'
import { account, info } from './account.js'
import { identify, register, validate } from './identity.js'
import { add, list, remove } from './store.js'
import * as UploadCaps from './upload.js'
import { claim, redeem } from './voucher.js'

// Account
export type Account = InferInvokedCapability<typeof account>
export type AccountInfo = InferInvokedCapability<typeof info>
// Voucher Protocol
export type VoucherRedeem = InferInvokedCapability<typeof redeem>
export type VoucherClaim = InferInvokedCapability<typeof claim>
// Identity
export type IdentityValidate = InferInvokedCapability<typeof validate>
export type IdentityRegister = InferInvokedCapability<typeof register>
export type IdentityIdentify = InferInvokedCapability<typeof identify>
// Upload
export type Upload = InferInvokedCapability<typeof UploadCaps.upload>
export type UploadAdd = InferInvokedCapability<typeof UploadCaps.add>
export type UploadRemove = InferInvokedCapability<typeof UploadCaps.remove>
export type UploadList = InferInvokedCapability<typeof UploadCaps.list>
// Store
export type StoreAdd = InferInvokedCapability<typeof add>
export type StoreRemove = InferInvokedCapability<typeof remove>
export type StoreList = InferInvokedCapability<typeof list>

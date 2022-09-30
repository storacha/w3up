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
// Store
export type StoreAdd = InferInvokedCapability<typeof add>
export type StoreRemove = InferInvokedCapability<typeof remove>
export type StoreList = InferInvokedCapability<typeof list>

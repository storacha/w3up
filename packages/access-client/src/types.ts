/* eslint-disable @typescript-eslint/indent */
import type {
  Capabilities,
  Failure,
  Phantom,
  RequestEncoder,
  ResponseDecoder,
  ServiceMethod,
  UCAN,
  URI,
} from '@ucanto/interface'

import type {
  AccountInfo,
  AccountRecover,
  AccountRecoverValidation,
  Any,
} from './capabilities/types'
import { VoucherClaim, VoucherRedeem } from './capabilities/types.js'

export * from './capabilities/types.js'

export interface ClientCodec extends RequestEncoder, ResponseDecoder {}

export type EncodedDelegation<C extends Capabilities = Capabilities> = string &
  Phantom<C>

export interface Service {
  voucher: {
    claim: ServiceMethod<
      VoucherClaim,
      EncodedDelegation<[VoucherRedeem]> | undefined,
      Failure
    >
    redeem: ServiceMethod<VoucherRedeem, void, Failure>
  }
  account: {
    info: ServiceMethod<AccountInfo, Account, Failure>
    'recover-validation': ServiceMethod<
      AccountRecoverValidation,
      EncodedDelegation<[AccountRecover]> | undefined,
      Failure
    >
    recover: ServiceMethod<
      AccountRecover,
      Array<EncodedDelegation<[Any]>>,
      Failure
    >
  }
}

export interface Account {
  did: UCAN.DID
  agent: UCAN.DID
  email: URI<'mailto:'>
  product: URI<'product:'>
  updated_at: string
  inserted_at: string
}

export interface AgentMeta {
  name: string
  description?: string
  url?: URL
  image?: URL
  type: 'device' | 'app' | 'service'
}

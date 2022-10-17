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
  IdentityIdentify,
  IdentityRegister,
  IdentityValidate,
} from './capabilities/types'
import { VoucherClaim, VoucherRedeem } from './capabilities/types.js'

export * from './capabilities/types.js'

export interface ClientCodec extends RequestEncoder, ResponseDecoder {}

export type EncodedDelegation<C extends Capabilities = Capabilities> = string &
  Phantom<C>

export interface Service {
  identity: {
    validate: ServiceMethod<
      IdentityValidate,
      // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
      { delegation: string } | void,
      never
    >
    register: ServiceMethod<IdentityRegister, void, never>
    identify: ServiceMethod<IdentityIdentify, string | undefined, never>
  }
  voucher: {
    claim: ServiceMethod<
      VoucherClaim,
      EncodedDelegation<[VoucherRedeem]> | undefined,
      Failure
    >
    redeem: ServiceMethod<VoucherRedeem, void, Failure>
  }
  account: {
    info: ServiceMethod<
      AccountInfo,
      {
        did: UCAN.DID
        agent: UCAN.DID
        email: URI<'mailto:'>
        product: URI<'product:'>
        updated_at: string
        inserted_at: string
      },
      Failure
    >
  }
}

export interface AgentMeta {
  name: string
  description?: string
  url?: URL
  image?: URL
  type: 'device' | 'app' | 'service'
}

/* eslint-disable @typescript-eslint/indent */
import type {
  Delegation,
  Fact,
  Proof,
  RequestEncoder,
  ResponseDecoder,
  ServiceMethod,
  SigningPrincipal,
  Principal,
  Failure,
  Phantom,
  Capabilities,
  Link as IPLDLink,
} from '@ucanto/interface'

import * as UCAN from '@ipld/dag-ucan'
import type {
  IdentityIdentify,
  IdentityRegister,
  IdentityValidate,
  UploadAdd,
  UploadList,
  UploadRemove,
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
  upload: {
    add: ServiceMethod<UploadAdd, UploadAddOk, InvalidUpload>
    /**
     * Upload list has no defined failure conditions (apart from usual ucanto
     * errors) which is why it's error is of type `never`. For unknown accounts
     * list MUST be considered empty.
     */
    list: ServiceMethod<UploadList, UploadListOk, never>
    /**
     * Upload remove has no defined failure condition (apart from usual ucanto
     * errors) which is why it's error is of type `never`. Removing an upload
     * not in the list MUST be considered succesful NOOP.
     */
    remove: ServiceMethod<UploadRemove, UploadRemoveOk, never>
  }
}

export interface AgentMeta {
  name: string
  description?: string
  url?: URL
  image?: URL
  type: 'device' | 'app' | 'service'
}

export interface ValidateOptions {
  url?: URL
  audience?: Principal
  issuer: SigningPrincipal
  with?: UCAN.DID
  caveats: {
    as: `mailto:${string}`
  }
  lifetimeInSeconds?: number
  expiration?: number
  notBefore?: number

  nonce?: string

  facts?: Fact[]
  proofs?: Proof[]
}

export interface RegisterOptions {
  url?: URL
  audience?: Principal
  issuer: SigningPrincipal
  with?: `mailto:${string}`
  caveats?: {
    as: UCAN.DID
  }
  lifetimeInSeconds?: number
  expiration?: number
  notBefore?: number

  nonce?: string

  facts?: Fact[]
  proof: Delegation<[IdentityRegister]>
}

export interface IdentifyOptions {
  url?: URL
  audience?: Principal
  issuer: SigningPrincipal
  with?: `mailto:${string}`
  caveats?: {
    as: UCAN.DID
  }
  lifetimeInSeconds?: number
  expiration?: number
  notBefore?: number

  nonce?: string

  facts?: Fact[]
  proof?: Delegation<[IdentityIdentify]>
}

export interface PullRegisterOptions {
  url?: URL
  issuer: SigningPrincipal
  signal?: AbortSignal
}

/**
 * Error MAY occur on `upload/add` if provided `shards` contain invalid CIDs e.g
 * non CAR cids.
 */

export interface InvalidUpload extends Failure {
  name: 'InvalidUpload'
}

/**
 * On succeful upload/add provider will respond back with a `root` CID that
 * was added.
 */
export interface UploadAddOk {
  root: IPLDLink
}

/**
 * On succesful upload/list provider returns `uploads` list of `{root}` elements.
 * Please note that by wrapping list in an object we create an opportunity to
 * extend type in backwards compatible way to accomodate for paging information
 * in the future. Likewise list contains `{root}` objects which also would allow
 * us to add more fields in a future like size, date etc...
 */
export interface UploadListOk {
  uploads: Array<{ root: IPLDLink }>
}

/**
 * On succesful upload/remove provider returns empty object. Please not that
 * will allow us to extend result type with more things in the future in a
 * backwards compatible way.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UploadRemoveOk {}

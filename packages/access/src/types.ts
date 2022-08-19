/* eslint-disable @typescript-eslint/indent */
import type {
  Delegation,
  Fact,
  Proof,
  RequestEncoder,
  ResponseDecoder,
  ServiceMethod,
  SigningAuthority,
  UCAN,
} from '@ucanto/interface'
import type {
  IdentityIdentify,
  IdentityRegister,
  IdentityValidate,
} from './capabilities-types.js'

export * from './capabilities-types.js'

export interface ClientCodec extends RequestEncoder, ResponseDecoder {}

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
}

export interface ValidateOptions {
  url?: URL
  audience?: UCAN.Identity
  issuer: SigningAuthority
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
  audience?: UCAN.Identity
  issuer: SigningAuthority
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

export interface PullRegisterOptions {
  url?: URL
  issuer: SigningAuthority
}

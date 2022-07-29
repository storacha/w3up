/* eslint-disable @typescript-eslint/indent */
import type {
  Capability,
  DID,
  RequestEncoder,
  ResponseDecoder,
  ServiceMethod,
} from '@ucanto/interface'

import type { JWT } from '@ipld/dag-ucan'
import * as Types from '@ucanto/interface'

export interface ClientCodec extends RequestEncoder, ResponseDecoder {}

export interface Link<
  T extends unknown = unknown,
  C extends number = number,
  A extends number = number,
  V extends 0 | 1 = 0 | 1
> extends Types.Link<T, C, A, V> {}

export interface Add extends Capability<'store/add', DID> {
  link?: Link
}

export interface Remove extends Capability<'store/remove', DID> {
  link?: Link
}

export interface List extends Capability<'store/list', DID> {}

export interface IdentityValidate extends Capability<'identity/validate', DID> {
  as: `mailto:${string}`
}

export interface IdentityRegister
  extends Capability<'identity/register', `mailto:${string}`> {
  as: DID
}

export interface IdentityIdentify
  extends Capability<'identity/identify', DID> {}

export interface Service {
  identity: {
    validate: ServiceMethod<
      IdentityValidate,
      { delegation: JWT } | undefined,
      never
    >
    register: ServiceMethod<IdentityRegister, void, never>
    identify: ServiceMethod<IdentityIdentify, string | undefined, never>
  }
}

import * as Server from '@ucanto/server'
import type {
  ServerView,
  ConnectionView,
  SigningAuthority,
  Audience,
  MalformedCapability,
  InvocationError,
  UCAN,
} from '@ucanto/interface'
import type { Capability, ServiceMethod, DID, Failure } from '@ucanto/server'
import * as Accounting from './accounting'
import * as Identity from './identity'
import * as Signer from '../signer/type'
import * as API from '@ucanto/interface'
import * as CAR from '@ucanto/transport/car'

export interface Link<
  T extends unknown = unknown,
  C extends number = number,
  A extends number = number,
  V extends 0 | 1 = 0 | 1
> extends API.Link<T, C, A, V> {}

export interface StoreService {
  start(options: ServiceOptions): Server.ServerView<Store>
}
export interface ServiceOptions {
  id: SigningAuthority
  identity: ConnectionView<{ identity: Identity.Identity }>

  accounting: Accounting.Provider

  signingOptions: Signer.SignOptions
}

export interface Options {
  transport: Server.InboundTransportOptions
  validation?: Server.ValidatorOptions
  context: ServiceOptions
}

export interface Store {
  add: ServiceMethod<
    Add,
    AddState,
    | Identity.NotRegistered
    | Accounting.Error
    | MalformedCapability
    // It may fail to reach identity service
    | InvocationError
  >
  remove: ServiceMethod<Remove, Link, MalformedCapability | InvocationError>

  list: ServiceMethod<List, Link[], InvocationError>
}

export type AddState = AddDone | UploadRequired

export interface AddDone {
  status: 'done'
  with: DID
  link: Link
}

export interface UploadRequired {
  status: 'upload'
  with: DID
  link: Link
  url: string
  headers: Record<string, string>
}

export type CARLink = Link<CAR.codec.Model, typeof CAR.codec.code>

export interface Add extends Capability<'store/add', DID> {
  link?: Link
}

export interface Remove extends Capability<'store/remove', DID> {
  link?: Link
}

export interface List extends Capability<'store/list', DID> {}

export type Action = Add | Remove | List

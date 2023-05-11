/* eslint-disable @typescript-eslint/method-signature-style */
/* eslint-disable unicorn/prefer-export-from */
import type {
  DID,
  DIDKey as SpaceDID,
  Failure,
  Unit,
  Result,
  ServiceMethod,
  Match,
  CapabilityParser,
  ParsedCapability,
  DelegationOptions,
  InferInvokedCapability,
} from '@ucanto/interface'
import * as UploadAPI from './service/upload-api-proxy.js'
import * as AccessAPI from '@web3-storage/access/types'
import type { RouteContext } from './bindings.js'
import * as Capabilities from '@web3-storage/capabilities'
import type { ProviderInput } from '@ucanto/server'

export * from '@web3-storage/access/types'
export * from '@ucanto/interface'
export * from '@web3-storage/capabilities/types'
export type { SpaceDID, Unit, RouteContext, DelegationOptions }
export type AccountDID = DID<'mailto'>
export type ServiceDID = DID<'web'>

export type { ProvisionsStorage } from './types/provisions.js'
export type { DelegationsStorage } from './types/delegations.js'

export type AllocationError = InsufficientStorage

export interface InsufficientStorage extends Failure {
  name: 'InsufficientStorage'
}

export interface SpaceProviderRegistry {
  hasStorageProvider(space: SpaceDID): Promise<Result<boolean, never>>
}

export { AccessAPI, UploadAPI }
export interface Service extends AccessAPI.Service, UploadAPI.Service {
  consumer: {
    has: ServiceMethod<
      InferInvokedCapability<typeof Capabilities.Consumer.has>,
      boolean,
      Failure
    >
  }
  customer: {
    get: ServiceMethod<
      InferInvokedCapability<typeof Capabilities.Customer.get>,
      CustomerGetOk,
      CustomerGetError
    >
  }
  console: {
    log: ServiceMethod<
      InferInvokedCapability<typeof Capabilities.Console.log>,
      {},
      never
    >
    error: ServiceMethod<
      InferInvokedCapability<typeof Capabilities.Console.error>,
      never,
      Failure & { cause: unknown }
    >
  }
}

export interface UnknownProvider extends Failure {
  name: 'UnknownProvider'
}

export type CustomerGetError = UnknownProvider

export interface CustomerGetOk {
  customer: null | {
    did: AccountDID
  }
}

export type CustomerGetResult = Result<CustomerGetOk, CustomerGetError>

export type Input<C extends CapabilityParser<Match<ParsedCapability>>> =
  ProviderInput<InferInvokedCapability<C> & ParsedCapability>

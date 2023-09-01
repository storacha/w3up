import {
  ConnectionView,
  ServiceMethod,
  Signer,
  Proof,
  DID,
  Principal,
} from '@ucanto/interface'
import {
  FilecoinQueue,
  FilecoinAdd,
  FilecoinAddSuccess,
  FilecoinAddFailure,
  AggregateQueue,
  AggregateAdd,
  AggregateAddSuccess,
  AggregateAddFailure,
  DealQueue,
  DealAdd,
  DealAddSuccess,
  DealAddFailure,
  ChainTrackerInfo,
  ChainTrackerInfoSuccess,
  ChainTrackerInfoFailure,
} from '@web3-storage/capabilities/types'

export type SERVICE = 'STOREFRONT' | 'AGGREGATOR' | 'DEALER' | 'CHAIN_TRACKER'
export interface ServiceConfig {
  url: URL
  principal: Principal
}

export interface InvocationConfig {
  /**
   * Signing authority that is issuing the UCAN invocation(s).
   */
  issuer: Signer
  /**
   * The principal delegated to in the current UCAN.
   */
  audience?: Principal
  /**
   * The resource the invocation applies to.
   */
  with: DID
  /**
   * Proof(s) the issuer has the capability to perform the action.
   */
  proofs?: Proof[]
}

export interface StorefrontService {
  filecoin: {
    queue: ServiceMethod<FilecoinQueue, FilecoinAddSuccess, FilecoinAddFailure>
    add: ServiceMethod<FilecoinAdd, FilecoinAddSuccess, FilecoinAddFailure>
  }
}

export interface AggregatorService {
  aggregate: {
    queue: ServiceMethod<
      AggregateQueue,
      AggregateAddSuccess,
      AggregateAddFailure
    >
    add: ServiceMethod<AggregateAdd, AggregateAddSuccess, AggregateAddFailure>
  }
}

export interface DealerService {
  deal: {
    queue: ServiceMethod<DealQueue, DealAddSuccess, DealAddFailure>
    add: ServiceMethod<DealAdd, DealAddSuccess, DealAddFailure>
  }
}

export interface ChainTrackerService {
  'chain-tracker': {
    info: ServiceMethod<
      ChainTrackerInfo,
      ChainTrackerInfoSuccess,
      ChainTrackerInfoFailure
    >
  }
}

export interface RequestOptions<S extends Record<string, any>> {
  connection?: ConnectionView<S>
}

export interface Connectable<S extends Record<string, any>> {
  connection?: ConnectionView<S>
}

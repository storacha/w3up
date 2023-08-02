import {
  ConnectionView,
  ServiceMethod,
  Signer,
  Proof,
  DID,
  Principal,
} from '@ucanto/interface'
import {
  FilecoinAdd,
  FilecoinAddSuccess,
  FilecoinAddFailure,
  PieceAdd,
  PieceAddSuccess,
  PieceAddFailure,
  AggregateAdd,
  AggregateAddSuccess,
  AggregateAddFailure,
  ChainInfo,
  ChainInfoSuccess,
  ChainInfoFailure,
} from '@web3-storage/capabilities/types'

export type SERVICE = 'STORE_FRONT' | 'AGGREGATOR' | 'BROKER' | 'CHAIN'
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
    add: ServiceMethod<FilecoinAdd, FilecoinAddSuccess, FilecoinAddFailure>
  }
}

export interface AggregatorService {
  piece: {
    add: ServiceMethod<PieceAdd, PieceAddSuccess, PieceAddFailure>
  }
}

export interface BrokerService {
  aggregate: {
    add: ServiceMethod<AggregateAdd, AggregateAddSuccess, AggregateAddFailure>
  }
}

export interface ChainService {
  chain: {
    info: ServiceMethod<ChainInfo, ChainInfoSuccess, ChainInfoFailure>
  }
}

export interface DealConfig {
  tenantId: string
  label?: string
}

export interface RequestOptions extends Connectable<any> {}

export interface Connectable<S extends Record<string, any>> {
  connection?: ConnectionView<S>
}

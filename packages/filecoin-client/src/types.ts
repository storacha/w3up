import {
  ConnectionView,
  ServiceMethod,
  Signer,
  Proof,
  DID,
  Principal,
} from '@ucanto/interface'
import {
  FilecoinOffer,
  FilecoinOfferSuccess,
  FilecoinOfferFailure,
  FilecoinSubmit,
  FilecoinSubmitSuccess,
  FilecoinSubmitFailure,
  FilecoinAccept,
  FilecoinAcceptSuccess,
  FilecoinAcceptFailure,
  FilecoinInfo,
  FilecoinInfoSuccess,
  FilecoinInfoFailure,
  PieceOffer,
  PieceOfferSuccess,
  PieceOfferFailure,
  PieceAccept,
  PieceAcceptSuccess,
  PieceAcceptFailure,
  AggregateOffer,
  AggregateOfferSuccess,
  AggregateOfferFailure,
  AggregateAccept,
  AggregateAcceptSuccess,
  AggregateAcceptFailure,
  DealInfo,
  DealInfoSuccess,
  DealInfoFailure,
} from '@storacha/capabilities/types'

export type SERVICE = 'STOREFRONT' | 'AGGREGATOR' | 'DEALER' | 'DEAL_TRACKER'
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
    offer: ServiceMethod<
      FilecoinOffer,
      FilecoinOfferSuccess,
      FilecoinOfferFailure
    >
    submit: ServiceMethod<
      FilecoinSubmit,
      FilecoinSubmitSuccess,
      FilecoinSubmitFailure
    >
    accept: ServiceMethod<
      FilecoinAccept,
      FilecoinAcceptSuccess,
      FilecoinAcceptFailure
    >
    info: ServiceMethod<FilecoinInfo, FilecoinInfoSuccess, FilecoinInfoFailure>
  }
}

export interface AggregatorService {
  piece: {
    offer: ServiceMethod<PieceOffer, PieceOfferSuccess, PieceOfferFailure>
    accept: ServiceMethod<PieceAccept, PieceAcceptSuccess, PieceAcceptFailure>
  }
}

export interface DealerService {
  aggregate: {
    offer: ServiceMethod<
      AggregateOffer,
      AggregateOfferSuccess,
      AggregateOfferFailure
    >
    accept: ServiceMethod<
      AggregateAccept,
      AggregateAcceptSuccess,
      AggregateAcceptFailure
    >
  }
}

export interface DealTrackerService {
  deal: {
    info: ServiceMethod<DealInfo, DealInfoSuccess, DealInfoFailure>
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface RequestOptions<S extends Record<string, any>> {
  connection?: ConnectionView<S>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Connectable<S extends Record<string, any>> {
  connection?: ConnectionView<S>
}

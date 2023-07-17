import { Link } from 'multiformats/link'
import type { PieceLink } from '@web3-storage/data-segment'
import { CAR } from '@ucanto/transport'
import {
  ConnectionView,
  ServiceMethod,
  Signer,
  Proof,
  DID,
  Principal,
} from '@ucanto/interface'
import {
  AggregateOffer,
  AggregateOfferSuccess,
  AggregateOfferFailure,
  AggregateGet,
  AggregateGetSuccess,
  AggregateGetFailure,
  OfferArrange,
  OfferArrangeSuccess,
  OfferArrangeFailure,
} from '@web3-storage/capabilities/types'

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

export interface Service {
  aggregate: {
    offer: ServiceMethod<
      AggregateOffer,
      AggregateOfferSuccess,
      AggregateOfferFailure
    >
    get: ServiceMethod<AggregateGet, AggregateGetSuccess, AggregateGetFailure>
  }
  offer: {
    arrange: ServiceMethod<
      OfferArrange,
      OfferArrangeSuccess,
      OfferArrangeFailure
    >
  }
}

export interface RequestOptions extends Connectable {}

export interface Connectable {
  connection?: ConnectionView<Service>
}

/**
 * An IPLD Link that has the CAR codec code.
 */
export type CARLink = Link<unknown, typeof CAR.codec.code>

/**
 * Filecoin piece proof that can be used to derivew `PieceInfo`.
 * [Piece](https://spec.filecoin.io/systems/filecoin_files/piece/) information
 * for this CAR file.
 */
export interface Piece {
  link: PieceLink
  height: number
}

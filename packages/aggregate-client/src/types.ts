import { Link } from 'multiformats/link'
import { CAR } from '@ucanto/transport'
import {
  ConnectionView,
  ServiceMethod,
  Signer,
  Proof,
  DID,
  Principal,
  ToString,
  Failure,
} from '@ucanto/interface'
import {
  AggregateOffer,
  AggregateGet,
  OfferArrange,
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
  proofs: Proof[]
}

export interface Service {
  aggregate: {
    offer: ServiceMethod<AggregateOffer, AggregateOfferResponse, Failure>
    get: ServiceMethod<AggregateGet, AggregateGetResponse, Failure>
  }
  offer: {
    arrange: ServiceMethod<OfferArrange, {}, Failure>
  }
}

export interface AggregateGetResponse {
  deals: unknown[]
}

export interface AggregateOfferResponse {
  status: string
}

export interface Offer {
  link: CARLink
  size: number
  commitmentProof: string // TODO: ProofLink
  src: OfferSrc[]
}

export interface RequestOptions extends Connectable {}

export interface Connectable {
  connection?: ConnectionView<Service>
}

/**
 * An IPLD Link that has the CAR codec code.
 */
export type CARLink = Link<unknown, typeof CAR.codec.code>

export type OfferSrc = ToString<URL>

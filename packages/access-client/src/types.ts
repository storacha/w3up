/* eslint-disable @typescript-eslint/indent */
import type {
  Capabilities,
  ConnectionView,
  Fact,
  Failure,
  Phantom,
  Principal,
  RequestEncoder,
  Resource,
  ResponseDecoder,
  ServiceMethod,
  UCAN,
  URI,
  InferInvokedCapability,
  CapabilityParser,
  Match,
  Ability,
  UnknownMatch,
  Transport,
  Delegation,
} from '@ucanto/interface'

import type {
  Abilities,
  AccountInfo,
  AccountRecover,
  AccountRecoverValidation,
  Any,
} from './capabilities/types'
import { VoucherClaim, VoucherRedeem } from './capabilities/types.js'
import { Store, StoreData } from './stores/types.js'
import type { SetRequired } from 'type-fest'

// export capabilities types
export * from './capabilities/types.js'

export interface ClientCodec extends RequestEncoder, ResponseDecoder {}

export type EncodedDelegation<C extends Capabilities = Capabilities> = string &
  Phantom<C>

export interface Service {
  voucher: {
    claim: ServiceMethod<
      VoucherClaim,
      EncodedDelegation<[VoucherRedeem]> | undefined,
      Failure
    >
    redeem: ServiceMethod<VoucherRedeem, void, Failure>
  }
  account: {
    info: ServiceMethod<AccountInfo, Account, Failure>
    'recover-validation': ServiceMethod<
      AccountRecoverValidation,
      EncodedDelegation<[AccountRecover]> | undefined,
      Failure
    >
    recover: ServiceMethod<
      AccountRecover,
      Array<EncodedDelegation<[Any]>>,
      Failure
    >
  }
}

export interface Account {
  did: UCAN.DID
  agent: UCAN.DID
  email: URI<'mailto:'>
  product: URI<'product:'>
  updated_at: string
  inserted_at: string
}

export interface AgentMeta {
  name: string
  description?: string
  url?: URL
  image?: URL
  type: 'device' | 'app' | 'service'
}

export interface AgentOptions<T> {
  store: Store<T>
  connection: ConnectionView<Service>
  url?: URL
  fetch: typeof fetch
  data: StoreData<T>
}

export interface AgentCreateOptions<T> {
  channel?: Transport.Channel<Service>
  store: Store<T>
  url?: URL
  fetch?: typeof fetch
}

export type ExecuteOptions<
  A extends Ability,
  R extends Resource,
  CAP extends CapabilityParser<
    Match<{ can: A; with: R; nb?: {} | undefined }, UnknownMatch>
  >
> = UCANBasicOptions &
  InferNb<InferInvokedCapability<CAP>['nb']> & {
    /**
     * Resource for the capability, normally a Space DID
     * Defaults to the current selected Space
     */
    with?: R

    /**
     * Extra proofs to be added to the invocation
     */
    proofs?: Delegation[]
  }

export type DelegationOptions = SetRequired<UCANBasicOptions, 'audience'> & {
  /**
   * Abilities to delegate
   */
  abilities: Abilities[]
  /**
   * Metadata about the audience
   */
  audienceMeta: AgentMeta
}

export interface UCANBasicOptions {
  /**
   * Audience Principal (DID),
   * Defaults to "Access service DID"
   *
   * @see {@link https://github.com/ucan-wg/spec#321-principals Spec}
   */
  audience?: Principal
  /**
   * UCAN lifetime in seconds
   */
  lifetimeInSeconds?: number
  /**
   * Unix timestamp when the UCAN is no longer valid
   *
   * Expiration overrides `lifetimeInSeconds`
   *
   * @see {@link https://github.com/ucan-wg/spec#322-time-bounds Spec}
   */
  expiration?: number
  /**
   * Unix timestamp when the UCAN becomas valid
   *
   * @see {@link https://github.com/ucan-wg/spec#322-time-bounds Spec}
   */
  notBefore?: number
  /**
   * Nonce, a randomly generated string, used to ensure the uniqueness of the UCAN.
   *
   * @see {@link https://github.com/ucan-wg/spec#323-nonce Spec}
   */
  nonce?: string
  /**
   * Facts, an array of extra facts or information to attach to the UCAN
   *
   * @see {@link https://github.com/ucan-wg/spec#324-facts Spec}
   */
  facts?: Fact[]
}

/**
 * Given an inferred capability infers if the nb field is optional or not
 */
export type InferNb<C extends {} | undefined> = keyof C extends never
  ? {
      nb?: never
    }
  : {
      /**
       * Non-normative fields for the capability
       *
       * Check the capability definition for more details on the `nb` field.
       *
       * @see {@link https://github.com/ucan-wg/spec#241-nb-non-normative-fields Spec}
       */
      nb: C
    }

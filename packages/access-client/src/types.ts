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
  InferInvokedCapability,
  CapabilityParser,
  Match,
  Ability,
  UnknownMatch,
  Delegation,
  DID,
  Signer,
  SignerArchive,
  SigAlg,
  Caveats,
  Unit,
} from '@ucanto/interface'

export type { UTCUnixTimestamp } from '@ipld/dag-ucan'

import type {
  Abilities,
  SpaceInfo,
  AccessAuthorize,
  AccessAuthorizeSuccess,
  AccessDelegate,
  AccessDelegateFailure,
  AccessDelegateSuccess,
  AccessClaim,
  AccessClaimSuccess,
  AccessClaimFailure,
  ProviderAdd,
  ProviderAddSuccess,
  ProviderAddFailure,
  AccessConfirm,
  AccessConfirmSuccess,
  AccessConfirmFailure,
  UCANRevoke,
  UCANRevokeSuccess,
  UCANRevokeFailure,
  AccountDID,
  ProviderDID,
  SpaceDID,
  PlanGet,
  PlanGetSuccess,
  PlanGetFailure,
  SubscriptionList,
  SubscriptionListSuccess,
  SubscriptionListFailure,
  PlanSet,
  PlanSetSuccess,
  PlanSetFailure,
} from '@web3-storage/capabilities/types'
import type { SetRequired } from 'type-fest'
import { Driver } from './drivers/types.js'
import { SpaceUnknown } from './errors.js'

// export other types
export * from '@ucanto/interface'
export * from '@web3-storage/capabilities/types'
export * from './errors.js'
export * from '@web3-storage/did-mailto'
export type { Agent } from './agent.js'
export type { OwnedSpace, SharedSpace } from './space.js'

export interface SpaceInfoResult {
  // space did
  did: DID<'key'>
  providers: Array<DID<'web'>>
}

export interface CapabilityQuery {
  can: Ability
  with: ResourceQuery
  nb?: unknown
}

export type { AccountDID, ProviderDID, SpaceDID }

/**
 * Describes level of access to a resource.
 */
export type Access =
  // This complicates type workarounds the issue with TS which will would have
  // complained about missing `*` key if we have used `Record<Ability, Unit>`
  // instead.
  Record<Exclude<Ability, '*'>, Unit> & {
    ['*']?: Unit
  }

export type ResourceQuery = Resource | RegExp

/**
 * Access api service definition type
 */
export interface Service {
  access: {
    authorize: ServiceMethod<AccessAuthorize, AccessAuthorizeSuccess, Failure>
    claim: ServiceMethod<AccessClaim, AccessClaimSuccess, AccessClaimFailure>
    // eslint-disable-next-line @typescript-eslint/ban-types
    confirm: ServiceMethod<
      AccessConfirm,
      AccessConfirmSuccess,
      AccessConfirmFailure
    >
    delegate: ServiceMethod<
      AccessDelegate,
      AccessDelegateSuccess,
      AccessDelegateFailure
    >
  }
  provider: {
    add: ServiceMethod<ProviderAdd, ProviderAddSuccess, ProviderAddFailure>
  }
  space: {
    info: ServiceMethod<SpaceInfo, SpaceInfoResult, Failure | SpaceUnknown>
  }
  subscription: {
    list: ServiceMethod<
      SubscriptionList,
      SubscriptionListSuccess,
      SubscriptionListFailure
    >
  }
  ucan: {
    revoke: ServiceMethod<UCANRevoke, UCANRevokeSuccess, UCANRevokeFailure>
  }
  plan: {
    get: ServiceMethod<PlanGet, PlanGetSuccess, PlanGetFailure>
    set: ServiceMethod<PlanSet, PlanSetSuccess, PlanSetFailure>
  }
}

/**
 * Schema types
 *
 * Interfaces for data structures used in the client
 *
 */

export type CIDString = string

/**
 * Data schema used internally by the agent.
 */
export interface AgentDataModel {
  meta: AgentMeta
  principal: Signer<DID<'key'>>
  /** @deprecated */
  currentSpace?: DID<'key'>
  /** @deprecated */
  spaces: Map<DID, SpaceMeta>
  delegations: Map<CIDString, { meta: DelegationMeta; delegation: Delegation }>
}

/**
 * Agent data that is safe to pass to structuredClone() and persisted by stores.
 */
export type AgentDataExport = Pick<
  AgentDataModel,
  'meta' | 'currentSpace' | 'spaces'
> & {
  principal: SignerArchive<DID, SigAlg>
  delegations: Map<
    CIDString,
    {
      meta: DelegationMeta
      delegation: Array<{ cid: CIDString; bytes: ArrayBuffer }>
    }
  >
}

/**
 * Agent metadata used to describe an agent ("audience")
 * with a more human and UI friendly data
 */
export interface AgentMeta {
  name: string
  description?: string
  url?: URL
  image?: URL
  type: 'device' | 'app' | 'service'
}

/**
 * Delegation metadata
 */
export interface DelegationMeta {
  /**
   * Audience metadata to be easier to build UIs with human readable data
   * Normally used with delegations issued to third parties or other devices.
   */
  audience?: AgentMeta
}

/**
 * Space metadata
 */
export interface SpaceMeta {
  /**
   * Human readable name for the space
   */
  name: string
}

/**
 * Agent class types
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AgentOptions<S extends Record<string, any>> {
  url?: URL
  connection?: ConnectionView<S>
  servicePrincipal?: Principal
}

export interface AgentDataOptions {
  store?: Driver<AgentDataExport>
}

export type InvokeOptions<
  A extends Ability,
  R extends Resource,
  CAP extends CapabilityParser<
    Match<{ can: A; with: R & Resource; nb: Caveats }, UnknownMatch>
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

/**
 * Utility types
 */

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
export type InferNb<C extends Record<string, unknown> | undefined> =
  keyof C extends never
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

export interface ClientCodec extends RequestEncoder, ResponseDecoder {}

export type EncodedDelegation<C extends Capabilities = Capabilities> = string &
  Phantom<C>

export type BytesDelegation<C extends Capabilities = Capabilities> =
  Uint8Array & Phantom<Delegation<C>>

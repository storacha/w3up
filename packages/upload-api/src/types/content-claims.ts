import { ConnectionView, DID, Principal, Proof, Signer } from '@ucanto/interface'
import { Service } from '@web3-storage/content-claims/server/service/api'

export type { ConnectionView, DID, Principal, Proof, Signer }
export type { Service }

export interface ClaimsInvocationConfig {
  /** Signing authority issuing the UCAN invocation(s). */
  issuer: Signer
  /** The principal delegated to in the current UCAN. */
  audience: Principal
  /** The resource the invocation applies to. */
  with: DID
  /** Proof(s) the issuer has the capability to perform the action. */
  proofs?: Proof[]
}

export interface ClaimsClientContext {
  claimsService: {
    invocationConfig: ClaimsInvocationConfig
    connection: ConnectionView<Service>
  }
}

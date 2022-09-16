import type {
  Capability,
  ServiceMethod,
  DID,
  Resource,
  Failure,
} from '@ucanto/server'
import type { API, URI } from '@ucanto/interface'
import type { ServiceError } from './error'

export interface Identity {
  /**
   * Associates two UserIDs with one another. Order of UserIDs does not matter
   * as semantically account is a set of UserIDs and this operation is join of
   * sets that each UserID belongs to. If neither UserID belogs to an account
   * (set) this MUST produce `NotRegistered`. If both UserIDs belong to two
   * different accounts they get joined into a single joint account (set).
   */
  link: ServiceMethod<Link, null, NotRegistered>
  /**
   * This is equivalent of `link` operation, only difference is unlike `link`
   * this MUST create a new account (set) if neither belong to a any account
   * (set).
   */
  register: ServiceMethod<Register, null, never>

  validate: ServiceMethod<Validate, null, never>
  /**
   * Resolves account DID associated with a given DID. Returns either account
   * did (which will have form of `did:ipld:bafy...hash`) or fails with
   * `NotRegistered` error if no account exists for provided `UserID`.
   *
   * Please note that account did is not static and it will change when two
   * accounts are joined into one. New account DID will correspond to proof CID
   * provided in link/register request.
   */
  identify: ServiceMethod<Identify, DID, NotRegistered>
}

export type MailtoID = `mailto:${string}`
export type ID = `did:${string}` | MailtoID

export interface Register extends Capability<'identity/register', MailtoID> {
  as: `did:${string}`
}

export interface Validate extends Capability<'identity/validate', DID> {
  as: MailtoID
}

export interface Link extends Capability<'identity/link', DID> {
  as: DID
}

export interface Identify extends Capability<'identity/identify', DID> {}

export interface NotRegistered
  extends ServiceError<'NotRegistered', NotRegistered> {
  ids: [ID, ...ID[]]
}

export type Error = NotRegistered

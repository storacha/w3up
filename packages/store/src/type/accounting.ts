import { DID, LinkedProof, Result, Await } from "@ucanto/interface"
import * as API from "@ucanto/interface"
import { ServiceError } from "./error"
export type Error = QuotaViolationError

export interface QuotaViolationError
  extends ServiceError<"QuotaViolationError", QuotaViolationError> {}

export interface Link<
  T extends unknown = unknown,
  C extends number = number,
  A extends number = number,
  V extends 0 | 1 = 0 | 1
> extends API.Link<T, C, A, V> {}

export interface Provider {
  /**
   * Upload service will call this once it verified the UCAN and checked that
   * `group` is associated with some account. Provider will record link to
   * group association for the future accounting.
   *
   * @param group
   * @param link
   * @param proof
   */
  add(
    group: DID,
    link: Link,
    proof: LinkedProof
  ): Await<Result<LinkState, Error>>

  remove(group: DID, link: Link, proof: LinkedProof): Await<Result<null, never>>

  list(group: DID, proof: LinkedProof): Await<Result<Link[], never>>
}

interface LinkState {
  status: "in-s3" | "not-in-s3"
}

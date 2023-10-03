import * as Ucanto from '@ucanto/interface'

interface ByAudience {
  audience: Ucanto.DID<'key' | 'mailto'>
}
export type Query = ByAudience

export type Revocation = {
  iss: Ucanto.DID
  revoke: Ucanto.Link
  challenge: string
  cid: Ucanto.Link
}

export interface DelegationsStorage<
  Cap extends Ucanto.Capability = Ucanto.Capability
> {
  /**
   * Write several items into storage.
   *
   * Options accepts an optional `cause` that MUST be the CID of the invocation
   * that contains the given delegations. Implementations MAY choose
   * to avoid storing delegations as long as they can reliably
   * retrieve the invocation by CID when they need to return the given delegations.
   */
  putMany: (
    delegations: Ucanto.Delegation<Ucanto.Tuple<Cap>>[],
    options?: { cause?: Ucanto.Link }
  ) => Promise<Ucanto.Result<{}, Ucanto.Failure>>

  /**
   * get number of stored items
   */
  count: () => Promise<bigint>

  /**
   * find all items that match the query
   */
  find: (
    query: Query
  ) => Promise<
    Ucanto.Result<Ucanto.Delegation<Ucanto.Tuple<Cap>>[], Ucanto.Failure>
  >

  /**
   * Given a list of invocation CIDs, return a Ucanto Result with a boolean
   * success value that will be true if any of the identified invocations
   * have been revoked and false if all are valid.
   */
  areAnyRevoked: (
    invocationCids: Ucanto.Link[]
  ) => Promise<
    Ucanto.Result<Boolean, Ucanto.Failure>
  >

  /**
   * Revoke the delegations identified by the given Revocation.
   * 
   * Once a delegation has been revoked, it should no longer be returned by 
   * the `find` method in this interface and calling areAnyRevoked with
   * the CID in the given revocation should return true.
   */
  revoke: (
    revocation: Revocation
  ) => Promise<
    Ucanto.Result<{}, Ucanto.Failure>
  >
}

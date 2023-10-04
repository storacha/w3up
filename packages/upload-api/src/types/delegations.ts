import * as Ucanto from '@ucanto/interface'

interface ByAudience {
  audience: Ucanto.DID<'key' | 'mailto'>
}
export type Query = ByAudience

export interface RevocationMeta {
  context: Ucanto.Link
  cause: Ucanto.Link 
}

export type RevocationsToMeta = Record<
  Ucanto.ToString<Ucanto.Link>,
  RevocationMeta[]
>

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
   * Given a list of delegation CIDs, return a Ucanto Result with a map from
   * some or all of the CIDs to a list of "revocation context CIDs" for a
   * given CID - that is, a list of delegation CIDs that should no longer
   * be considered valid proof for the given CID.
   */
  getRevocations: (
    delegationCIDs: Ucanto.Link[]
  ) => Promise<
    Ucanto.Result<RevocationsToMeta, Ucanto.Failure>
  >

  /**
   * Revoke the delegation identified by delegationCID in a context
   * identified by revocationContextCID.
   * 
   * Once a delegation has been revoked, it should no longer be returned by 
   * the `find` method in this interface and calling areAnyRevoked with
   * the CID in the given revocation should return true.
   */
  revoke: (
    delegationCID: Ucanto.Link,
    revocationContextCID: Ucanto.Link,
    revocationInvocationCID: Ucanto.Link
  ) => Promise<
    Ucanto.Result<{}, Ucanto.Failure>
  >
}

import * as Ucanto from '@ucanto/interface'

interface ByAudience {
  audience: Ucanto.DID<'key' | 'mailto'>
}
export type Query = ByAudience

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
  ) => Promise<Ucanto.Result<Ucanto.Unit, Ucanto.Failure>>

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
}

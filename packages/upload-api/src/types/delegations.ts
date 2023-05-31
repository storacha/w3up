import * as Ucanto from '@ucanto/interface'

interface ByAudience {
  audience: Ucanto.DID<'key' | 'mailto'>
}
export type Query = ByAudience

export interface DelegationsStorage<
  Cap extends Ucanto.Capability = Ucanto.Capability
> {
  /**
   * write several items into storage
   *
   * @param delegations - delegations to store
   */
  putMany: (
    cause: Ucanto.Link,
    delegations: Ucanto.Delegation<Ucanto.Tuple<Cap>>[]
  ) => Promise<Ucanto.Result<{}, never>>

  /**
   * get number of stored items
   */
  count: () => Promise<bigint>

  /**
   * find all items that match the query
   */
  find: (query: Query) =>
   Promise<Ucanto.Result<Ucanto.Delegation<Ucanto.Tuple<Cap>>[], never>>
}

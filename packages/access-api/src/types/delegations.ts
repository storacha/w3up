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
    ...delegations: Array<Ucanto.Delegation<Ucanto.Tuple<Cap>>>
  ) => Promise<unknown>

  /**
   * get number of stored items
   */
  count: () => Promise<bigint>

  /**
   * iterate through all stored items
   */
  [Symbol.asyncIterator]: () => AsyncIterableIterator<
    Ucanto.Delegation<Ucanto.Tuple<Cap>>
  >

  /**
   * find all items that match the query
   */
  find: (query: Query) => AsyncIterable<Ucanto.Delegation<Ucanto.Tuple<Cap>>>
}

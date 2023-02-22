import * as Ucanto from '@ucanto/interface'

export type Resolvable<T> = T | Promise<T>

export interface DelegationsStorage<
  Cap extends Ucanto.Capability = Ucanto.Capability
> {
  /**
   * push items into storage
   *
   * @param delegations - delegations to store
   */
  push: (
    ...delegations: Array<Ucanto.Delegation<Ucanto.Tuple<Cap>>>
  ) => Resolvable<unknown>

  /**
   * get number of stored items
   */
  length: Resolvable<number>

  /**
   * iterate through all stored items
   */
  [Symbol.asyncIterator]: () => AsyncIterableIterator<
    Ucanto.Delegation<Ucanto.Tuple<Cap>>
  >
}

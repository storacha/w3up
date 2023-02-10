import * as Ucanto from '@ucanto/interface'

export type Resolvable<T> = T | Promise<T>

export interface DelegationsStorage<
  Cap extends Ucanto.Capability = Ucanto.Capability
> {
  push: (
    ...delegation: Array<Ucanto.Delegation<Ucanto.Tuple<Cap>>>
  ) => Resolvable<unknown>
  length: Resolvable<number>
  [Symbol.asyncIterator]: () => AsyncIterableIterator<
    Ucanto.Delegation<Ucanto.Tuple<Cap>>
  >
}

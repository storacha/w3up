import * as Ucanto from '@ucanto/interface'

export type DelegationsStorage = Pick<
  Array<Ucanto.Delegation<Ucanto.Capabilities>>,
  'push' | 'length'
> & {
  [Symbol.iterator]: () => IterableIterator<
    Ucanto.Delegation<Ucanto.Capabilities>
  >
}

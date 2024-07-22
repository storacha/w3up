import { Pageable, ListSuccess } from '../../src/types.js'

export interface StoreOptions<K, V> {
  getFn?: (items: Set<V>, item: K) => V | undefined
}

export interface QueryableStoreOptions<Q, V> {
  queryFn?: (items: Set<V>, query: Q, options?: Pageable) => ListSuccess<V>
}

export interface UpdatableStoreOptions<K, V> {
  updateFn?: (items: Set<V>, key: K, item: Partial<V>) => V
}

export interface ReadableStreamStoreOptions<K, V> {
  streamFn?: (items: Set<V>, item: K) => ReadableStream<V> | undefined
}

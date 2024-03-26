export interface StoreOptions<K, V> {
  getFn?: (items: Set<V>, item: K) => V | undefined
  queryFn?: (items: Set<V>, item: Partial<V>) => V[]
}

export interface UpdatableStoreOptions<K, V> extends StoreOptions<K, V> {
  updateFn?: (items: Set<V>, key: K, item: Partial<V>) => V
}

export interface StreammableStoreOptions<K, V> extends StoreOptions<K, V> {
  streamFn?: (items: Set<V>, item: K) => AsyncIterable<V> | undefined
}

import * as API from '../../src/types.js'
import { StoreOperationFailed, RecordNotFound } from '../../src/errors.js'

/**
 * @typedef {import('../../src/types.js').StorePutError} StorePutError
 * @typedef {import('../../src/types.js').StoreGetError} StoreGetError
 * @typedef {import('../../src/types.js').Pageable} Pageable
 */

/**
 * @template T
 * @typedef {import('../../src/types.js').ListSuccess<T>} ListSuccess
 */

/**
 * @template K
 * @template V
 * @template Q
 * @implements {API.Store<K, V>}
 * @implements {API.UpdatableStore<K, V>}
 * @implements {API.QueryableStore<Q, V>}
 */
export class Store {
  /**
   * @param {import('./types.js').StoreOptions<K, V> & import('./types.js').UpdatableStoreOptions<K, V> & import('./types.js').QueryableStoreOptions<Q, V> & import('./types.js').ReadableStreamStoreOptions<K, V>} options
   */
  constructor(options) {
    /** @type {Set<V>} */
    this.items = new Set()
    this.getFn = options.getFn
    this.updateFn = options.updateFn
    this.queryFn = options.queryFn
    this.streamFn = options.streamFn
  }

  /**
   * @param {V} record
   * @returns {Promise<import('@ucanto/interface').Result<{}, StorePutError>>}
   */
  async put(record) {
    this.items.add(record)

    return Promise.resolve({
      ok: {},
    })
  }

  /**
   *
   * @param {K} item
   * @returns {Promise<import('@ucanto/interface').Result<V, StoreGetError>>}
   */
  async get(item) {
    if (!this.getFn) {
      throw new Error('get not supported')
    }
    const t = this.getFn(this.items, item)
    if (!t) {
      return {
        error: new RecordNotFound('not found'),
      }
    }
    return {
      ok: t,
    }
  }

  /**
   * @param {K} item
   * @returns {Promise<import('@ucanto/interface').Result<boolean, StoreGetError>>}
   */
  async has(item) {
    if (!this.getFn) {
      throw new Error('has not supported')
    }
    const t = this.getFn(this.items, item)
    if (!t) {
      return {
        ok: false,
      }
    }
    return {
      ok: Boolean(t),
    }
  }

  /**
   * @param {Q} search
   * @param {Pageable} [options]
   * @returns {Promise<import('@ucanto/interface').Result<ListSuccess<V>, StoreGetError>>}
   */
  async query(search, options) {
    if (!this.queryFn) {
      throw new Error('query not supported')
    }
    const t = this.queryFn(this.items, search, options)
    return {
      ok: t,
    }
  }

  /**
   * @param {K} key
   * @param {Partial<V>} item
   * @returns {Promise<import('@ucanto/interface').Result<V, StoreGetError>>}
   */
  async update(key, item) {
    if (!this.updateFn) {
      throw new Error('update not supported')
    }
    const t = this.updateFn(this.items, key, item)
    if (!t) {
      return {
        error: new RecordNotFound('not found'),
      }
    }
    return {
      ok: t,
    }
  }

  /**
   * @param {K} item
   * @returns {Promise<import('@ucanto/interface').Result<ReadableStream<V>, StoreGetError>>}
   */
  async stream(item) {
    if (!this.streamFn) {
      throw new Error('stream not supported')
    }
    const t = this.streamFn(this.items, item)
    if (!t) {
      return {
        error: new RecordNotFound('not found'),
      }
    }
    return {
      ok: t,
    }
  }
}

/**
 * @template K
 * @template V
 * @template Q
 * @implements {API.Store<K, V>}
 * @implements {API.UpdatableStore<K, V>}
 * @implements {API.QueryableStore<Q, V>}
 */
export class FailingStore {
  /**
   * @param {V} record
   */
  async put(record) {
    return {
      error: new StoreOperationFailed('failed to put to store'),
    }
  }

  /**
   * @param {K} item
   * @returns {Promise<import('@ucanto/interface').Result<V, StoreGetError>>}
   */
  async get(item) {
    return {
      error: new StoreOperationFailed('failed to get from store'),
    }
  }

  /**
   * @param {K} item
   * @returns {Promise<import('@ucanto/interface').Result<boolean, StoreGetError>>}
   */
  async has(item) {
    return {
      error: new StoreOperationFailed('failed to check store'),
    }
  }

  /**
   * @param {Q} search
   * @returns {Promise<import('@ucanto/interface').Result<ListSuccess<V>, StoreGetError>>}
   */
  async query(search) {
    return {
      error: new StoreOperationFailed('failed to query store'),
    }
  }

  /**
   * @param {K} key
   * @param {Partial<V>} item
   * @returns {Promise<import('@ucanto/interface').Result<V, StoreGetError>>}
   */
  async update(key, item) {
    return {
      error: new StoreOperationFailed('failed to update store'),
    }
  }
}

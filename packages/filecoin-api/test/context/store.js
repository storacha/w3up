import * as API from '../../src/types.js'
import { StoreOperationFailed, RecordNotFound } from '../../src/errors.js'

/**
 * @typedef {import('../../src/types.js').StorePutError} StorePutError
 * @typedef {import('../../src/types.js').StoreGetError} StoreGetError
 */

/**
 * @template K
 * @template V
 * @implements {API.Store<K, V>}
 */
export class Store {
  /**
   * @param {import('./types.js').StoreOptions<K, V>} options
   */
  constructor(options) {
    /** @type {Set<V>} */
    this.items = new Set()

    this.getFn = options.getFn
    this.queryFn = options.queryFn
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
   * @param {Partial<V>} search
   * @returns {Promise<import('@ucanto/interface').Result<V[], StoreGetError>>}
   */
  async query(search) {
    if (!this.queryFn) {
      throw new Error('query not supported')
    }
    const t = this.queryFn(this.items, search)
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
 * @implements {API.StreammableStore<K,V>}
 */
export class StreammableStore {
  /**
   * @param {import('./types.js').StreammableStoreOptions<K, V>} options
   */
  constructor(options) {
    /** @type {Set<V>} */
    this.items = new Set()
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
   * @param {K} item
   * @returns {Promise<import('@ucanto/interface').Result<AsyncIterable<V>, StoreGetError>>}
   */
  async stream(item) {
    if (!this.streamFn) {
      throw new Error('get not supported')
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
 * @implements {API.UpdatableStore<K,V>}
 * @extends {Store<K, V>}
 */
export class UpdatableStore extends Store {
  /**
   * @param {import('./types.js').UpdatableStoreOptions<K, V>} options
   */
  constructor(options) {
    super(options)

    this.updateFn = options.updateFn
  }

  /**
   * @param {K} key
   * @param {Partial<V>} item
   * @returns {Promise<import('@ucanto/interface').Result<V, StoreGetError>>}
   */
  async update(key, item) {
    if (!this.updateFn) {
      throw new Error('query not supported')
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
}

/**
 * @template K
 * @template V
 * @extends {UpdatableStore<K, V>}
 */
export class FailingStore extends UpdatableStore {
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
   * @param {Partial<V>} search
   * @returns {Promise<import('@ucanto/interface').Result<V[], StoreGetError>>}
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

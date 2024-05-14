import * as API from './api.js'
import { base58btc } from 'multiformats/bases/base58'

/** @type {WeakMap<Uint8Array, string>} */
const cache = new WeakMap()

/** @param {API.MultihashDigest} digest */
const toBase58String = (digest) => {
  let str = cache.get(digest.bytes)
  if (!str) {
    str = base58btc.encode(digest.bytes)
    cache.set(digest.bytes, str)
  }
  return str
}

/**
 * @template {API.MultihashDigest} Key
 * @template Value
 * @implements {Map<Key, Value>}
 */
export class DigestMap {
  /** @type {Map<string, [Key, Value]>} */
  #data

  /**
   * @param {Array<[Key, Value]>} [entries]
   */
  constructor(entries) {
    this.#data = new Map()
    for (const [k, v] of entries ?? []) {
      this.set(k, v)
    }
  }

  get [Symbol.toStringTag]() {
    return 'DigestMap'
  }

  clear() {
    this.#data.clear()
  }

  /**
   * @param {Key} key
   * @returns {boolean}
   */
  delete(key) {
    const mhstr = toBase58String(key)
    return this.#data.delete(mhstr)
  }

  /**
   * @param {(value: Value, key: Key, map: Map<Key, Value>) => void} callbackfn
   * @param {any} [thisArg]
   */
  forEach(callbackfn, thisArg) {
    for (const [k, v] of this.#data.values()) {
      callbackfn.call(thisArg, v, k, this)
    }
  }

  /**
   * @param {Key} key
   * @returns {Value|undefined}
   */
  get(key) {
    const data = this.#data.get(toBase58String(key))
    if (data) return data[1]
  }

  /**
   * @param {Key} key
   * @returns {boolean}
   */
  has(key) {
    return this.#data.has(toBase58String(key))
  }

  /**
   * @param {Key} key
   * @param {Value} value
   */
  set(key, value) {
    this.#data.set(toBase58String(key), [key, value])
    return this
  }

  /** @returns {number} */
  get size() {
    return this.#data.size
  }

  /** @returns */
  [Symbol.iterator]() {
    return this.entries()
  }

  /** @returns {IterableIterator<[Key, Value]>} */
  *entries() {
    yield* this.#data.values()
  }

  /** @returns {IterableIterator<Key>} */
  *keys() {
    for (const [k] of this.#data.values()) {
      yield k
    }
  }

  /** @returns {IterableIterator<Value>} */
  *values() {
    for (const [, v] of this.#data.values()) {
      yield v
    }
  }
}

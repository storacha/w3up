import { base58btc } from 'multiformats/bases/base58'

/** @type {WeakMap<import('multiformats').MultihashDigest, string>} */
const cache = new WeakMap()

/** @param {import('multiformats').MultihashDigest} digest */
const toBase58String = (digest) => {
  let str = cache.get(digest)
  if (!str) {
    str = base58btc.encode(digest.bytes)
    cache.set(digest, str)
  }
  return str
}

/**
 * @template {import('multiformats').MultihashDigest} Key
 * @template Value
 * @implements {Map<Key, Value>}
 */
export class DigestMap extends Map {
  /** @type {Map<string, Key>} */
  #keys

  /**
   * @param {Array<[Key, Value]>} [entries]
   */
  constructor(entries) {
    super()
    this.#keys = new Map()
    for (const [k, v] of entries ?? []) {
      this.set(k, v)
    }
  }

  clear() {
    super.clear()
    this.#keys.clear()
  }

  /**
   * @param {Key} key
   * @returns {boolean}
   */
  delete(key) {
    const mhstr = toBase58String(key)
    super.delete(mhstr)
    return this.#keys.delete(mhstr)
  }

  /**
   * @param {(value: Value, key: Key, map: Map<Key, Value>) => void} callbackfn
   * @param {any} [thisArg]
   */
  forEach(callbackfn, thisArg) {
    super.forEach((v, k) => {
      const key = this.#keys.get(k)
      /* c8 ignore next line */
      if (!key) throw new Error('internal inconsistency')
      callbackfn.call(thisArg, v, key, this)
    })
  }

  /**
   * @param {Key} key
   * @returns {Value|undefined}
   */
  get(key) {
    return super.get(toBase58String(key))
  }

  /**
   * @param {Key} key
   * @returns {boolean}
   */
  has(key) {
    return super.has(toBase58String(key))
  }

  /**
   * @param {Key} key
   * @param {Value} value
   */
  set(key, value) {
    const mhstr = toBase58String(key)
    this.#keys.set(mhstr, key)
    return super.set(mhstr, value)
  }

  /** @returns {number} */
  get size() {
    return super.size
  }

  /** @returns */
  [Symbol.iterator]() {
    return this.entries()
  }

  /** @returns {IterableIterator<[Key, Value]>} */
  *entries() {
    for (const [k, v] of super.entries()) {
      const key = this.#keys.get(k)
      /* c8 ignore next line */
      if (!key) throw new Error('internal inconsistency')
      yield [key, v]
    }
  }

  /** @returns {IterableIterator<Key>} */
  keys() {
    return this.#keys.values()
  }

  /** @returns {IterableIterator<Value>} */
  values() {
    return super.values()
  }
}

import { base58btc } from 'multiformats/bases/base58'
export * from './types.js'

export class Blobdex {
  #items

  constructor() {
    this.#items = new Map()
  }

  /**
   * len numbers the count of items in this Blobdex.
   *
   * @returns {number}
   */
  len() {
    return this.#items.size
  }

  /**
   * add adds a new item to this Blobdex multihash digest bytes key.
   *
   * @param {import('multiformats').MultihashDigest} mh
   * @param {number} offset
   * @param {number} length
   */
  add(mh, offset, length) {
    const b58str = base58btc.encode(mh.bytes)
    this.addStr(b58str, offset, length)
  }

  /**
   * addStr adds a new item to this Blobdex with base-58 key.
   *
   * @param {string} b58Str
   * @param {number} offset
   * @param {number} length
   */
  addStr(b58Str, offset, length) {
    this.#items.set(b58Str, [offset, length])
  }

  /**
   * pos returns the offset and length of the block specified by multihash.
   *
   * @param {import('multiformats').MultihashDigest} digest
   * @returns {[number, number]}
   */
  pos(digest) {
    const b58Str = base58btc.encode(digest.bytes)
    return this.posStr(b58Str)
  }

  /**
   * posStr returns the offset and length of the block specified by multihash.
   *
   * @param {string} b58Str
   * @returns {[number, number]}
   */
  posStr(b58Str) {
    return this.#items.get(b58Str)
  }

  /**
   * encode returns a sorted map of items in this Blobdex.
   *
   * @returns {Map<string, [number, number]>}
   */
  encode() {
    return new Map([...this.#items.entries()].sort())
  }

  /**
   * Populate this Blobdex with the given items.
   *
   * @param {Map<string, [number, number]>} items
   */
  decode(items) {
    this.#items = new Map([...items.entries()])
  }
}

import * as API from '../../src/types.js'

/**
 * @template T
 * @implements {API.Store<T>}
 */
export class Store {
  /**
   * @param {(items: Set<T>, item: any) => T} lookupFn
   */
  constructor(lookupFn) {
    /** @type {Set<T>} */
    this.items = new Set()

    this.lookupFn = lookupFn
  }

  /**
   * @param {T} record
   */
  async put(record) {
    this.items.add(record)

    return Promise.resolve({
      ok: {},
    })
  }

  /**
   *
   * @param {any} item
   * @returns boolean
   */
  async get(item) {
    return {
      ok: this.lookupFn(this.items, item),
    }
  }
}

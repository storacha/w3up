import * as API from '../../src/types.js'

/**
 * @template T
 * @implements {API.TestStore<T>}
 */
export class Store {
  constructor() {
    /** @type {Set<T>} */
    this.items = new Set()
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

  all() {
    return Array.from(this.items)
  }
}

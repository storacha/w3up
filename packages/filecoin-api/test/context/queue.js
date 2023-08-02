import * as API from '../../src/types.js'

/**
 * @template T
 * @implements {API.TestQueue<T>}
 */
export class Queue {
  constructor() {
    /** @type {Set<T>} */
    this.items = new Set()
  }

  /**
   * @param {T} record
   */
  async add(record) {
    this.items.add(record)

    return Promise.resolve({
      ok: {},
    })
  }

  all() {
    return Array.from(this.items)
  }
}

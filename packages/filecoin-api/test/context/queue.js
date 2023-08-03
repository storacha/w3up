import * as API from '../../src/types.js'

/**
 * @template T
 * @implements {API.Queue<T>}
 */
export class Queue {
  /**
   * @param {object} [options]
   * @param {(message: T) => void} [options.onMessage]
   */
  constructor(options = {}) {
    /** @type {Set<T>} */
    this.items = new Set()

    this.onMessage = options.onMessage || (() => {})
  }

  /**
   * @param {T} record
   */
  async add(record) {
    this.items.add(record)

    this.onMessage(record)
    return Promise.resolve({
      ok: {},
    })
  }
}

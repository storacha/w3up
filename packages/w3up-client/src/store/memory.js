import * as API from '../types.js'

/**
 * Opens in-memory data store.
 *
 * @example
 * ```js
 * import * as Memory from '@web3-storage/w3up-client/store/memory'
 * const store = Memory.open()
 * ```
 *
 * @template Model
 * @returns {API.DataStore<Model>}
 */
export const open = () =>
  /** @type {API.DataStore<Model>} */ (new MemoryStore())

/**
 * @template {Record<string, any>} Model
 * @implements {API.DataStore<Model>}
 */
class MemoryStore {
  /**
   * @type {Model|undefined}
   */
  #data

  constructor() {
    this.#data = undefined
  }

  async connect() {}

  async close() {}

  async reset() {
    this.#data = undefined
  }

  /**
   * @param {Model} data
   */
  async save(data) {
    this.#data = { ...data }
  }

  /** @returns {Promise<Model|undefined>} */
  async load() {
    if (this.#data === undefined) return
    if (Object.keys(this.#data).length === 0) return
    return this.#data
  }
}

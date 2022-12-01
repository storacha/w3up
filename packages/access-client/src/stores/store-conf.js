import Conf from 'conf'
import * as JSON from '../utils/json.js'

/**
 * @template T
 * @typedef {import('./types').IStore<T>} Store
 */

/**
 * Store implementation with "conf"
 *
 * @template {Record<string, any>} T
 * @implements {Store<T>}
 */
export class StoreConf {
  /**
   * @type {Conf<T>}
   */
  #config

  /**
   * @param {{ profile: string }} opts
   */
  constructor(opts) {
    this.#config = new Conf({
      projectName: 'w3access',
      projectSuffix: '',
      configName: opts.profile,
      serialize: (v) => JSON.stringify(v),
      deserialize: (v) => JSON.parse(v),
    })
    this.path = this.#config.path
  }

  /**
   * @returns {Promise<Store<T>>}
   */
  async open() {
    return this
  }

  async close() {}

  async reset() {
    this.#config.clear()
  }

  /**
   * @param {T} data
   * @returns {Promise<Store<T>>}
   */
  async save(data) {
    this.#config.set(data)
    return this
  }

  /** @returns {Promise<T|undefined>} */
  async load() {
    const data = this.#config.store ?? {}
    if (Object.keys(data).length === 0) return
    return data
  }
}

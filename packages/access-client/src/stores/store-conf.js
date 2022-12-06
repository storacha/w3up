import Conf from 'conf'
import * as JSON from '../utils/json.js'

/**
 * @template T
 * @typedef {import('./types').IStore<T>} Store
 */

/**
 * Store implementation with "[conf](https://github.com/sindresorhus/conf)"
 *
 * Usage:
 *
 * ```js
 * import { StoreConf } from '@web3-storage/access/stores/store-conf'
 * ```
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

  async open() {}

  async close() {}

  async reset() {
    this.#config.clear()
  }

  /** @param {T} data */
  async save(data) {
    this.#config.set(data)
  }

  /** @returns {Promise<T|undefined>} */
  async load() {
    const data = this.#config.store ?? {}
    if (Object.keys(data).length === 0) return
    return data
  }
}

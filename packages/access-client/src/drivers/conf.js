import Conf from 'conf'
import * as JSON from '../utils/json.js'

/**
 * @template T
 * @typedef {import('./types').Driver<T>} Driver
 */

/**
 * Driver implementation with "[conf](https://github.com/sindresorhus/conf)"
 *
 * Usage:
 *
 * ```js
 * import { ConfDriver } from '@web3-storage/access/drivers/conf'
 * ```
 *
 * @template {Record<string, any>} T
 * @implements {Driver<T>}
 */
export class ConfDriver {
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
    if (typeof data === 'object') {
      data = { ...data }
      for (const [k, v] of Object.entries(data)) {
        if (v === undefined) {
          delete data[k]
        }
      }
    }
    this.#config.set(data)
  }

  /** @returns {Promise<T|undefined>} */
  async load() {
    const data = this.#config.store ?? {}
    if (Object.keys(data).length === 0) return
    return data
  }
}

import * as API from '../types.js'
import Conf from 'conf'

/**
 * @typedef {object} Options
 * @property {string} name
 * @property {string} [projectName]
 * @property {string} [projectSuffix]
 */

/**
 * Opens data store persisted via [conf](https://github.com/sindresorhus/conf)
 *
 * @example
 * ```js
 * import * as Store from '@web3-storage/w3up-client/store/conf'
 * const store = Store.open({ name: 'default' })
 * ```
 *
 * @template {Record<string, unknown>} Model
 * @param {Options} options
 * @returns {API.DataStore<Model>}
 */
export const open = ({ name, projectName = 'w3access', projectSuffix = '' }) =>
  new ConfStore({ name, projectName, projectSuffix })

/**
 * @template {Record<string, any>} Model
 * @implements {API.DataStore<Model>}
 */
export class ConfStore {
  /**
   * @type {Conf<Model>}
   */
  #config

  /**
   * @param {Required<Options>} options
   */
  constructor(options) {
    this.#config = new Conf({
      projectName: options.projectName,
      projectSuffix: options.projectSuffix,
      configName: options.name,
      serialize,
      deserialize,
    })
    this.path = this.#config.path
  }

  async connect() {}

  async close() {}

  async reset() {
    this.#config.clear()
  }

  /** @param {Model} data */
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

  /** @returns {Promise<Model|undefined>} */
  async load() {
    const data = this.#config.store ?? {}
    if (Object.keys(data).length === 0) return
    return data
  }
}

// JSON.stringify and JSON.parse with URL, Map and Uint8Array type support.

/**
 * @param {string} k
 * @param {any} v
 */
const replacer = (k, v) => {
  if (v instanceof URL) {
    return { $url: v.toString() }
  } else if (v instanceof Map) {
    return { $map: [...v.entries()] }
  } else if (v instanceof Uint8Array) {
    return { $bytes: [...v.values()] }
  } else if (v?.type === 'Buffer' && Array.isArray(v.data)) {
    return { $bytes: v.data }
  }
  return v
}

/**
 * @param {string} k
 * @param {any} v
 */
const reviver = (k, v) => {
  if (!v) return v
  if (v.$url) return new URL(v.$url)
  if (v.$map) return new Map(v.$map)
  if (v.$bytes) return new Uint8Array(v.$bytes)
  return v
}

/**
 * @param {unknown} value
 * @param {number|string} [space]
 */
const serialize = (value, space) => JSON.stringify(value, replacer, space)

/**
 * @param {string} value
 */
const deserialize = (value) => JSON.parse(value, reviver)

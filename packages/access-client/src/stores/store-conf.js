/* eslint-disable unicorn/no-null */
/* eslint-disable jsdoc/check-indentation */
import Conf from 'conf'
import { Signer } from '@ucanto/principal/ed25519'
import { delegationToString, stringToDelegation } from '../encoding.js'
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'

/**
 * @typedef {import('../types').AgentData<Signer.EdSigner>} StoreData
 * @typedef {import('./types').IStore<Signer.EdSigner>} Store
 * @typedef {{
 *    meta: import('../types.js').AgentMeta
 *    principal: string
 *    currentSpace: Ucanto.DID | undefined
 *    spaces: Array<[Ucanto.DID | undefined, import('../types').SpaceMeta]>
 *    delegations: Array<[import('../types').CIDString, {
 *      meta: import('../types').DelegationMeta,
 *      delegation: import('../types.js').EncodedDelegation
 *    }]>
 * }} Data
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
 * @implements {Store}
 */
export class StoreConf {
  /**
   * @type {Conf<Data>}
   */
  #config
  /**
   *
   * @param {{
   * profile: string
   * }} opts
   */
  constructor(opts) {
    this.#config = new Conf({
      projectName: 'w3access',
      projectSuffix: '',
      configName: opts.profile,
    })
    this.path = this.#config.path
  }

  /**
   *
   * @returns {Promise<Store>}
   */
  async open() {
    return this
  }

  async close() {}

  async reset() {
    this.#config.clear()
  }

  async exists() {
    return this.#config.has('meta') && this.#config.has('principal')
  }

  /** @type {Store['init']} */
  async init(data) {
    const principal = data.principal || (await Signer.generate())

    /** @type {StoreData} */
    const storeData = {
      meta: data.meta || { name: 'agent', type: 'device' },
      spaces: data.spaces || new Map(),
      delegations: data.delegations || new Map(),
      principal,
      currentSpace: data.currentSpace,
    }

    await this.save(storeData)
    return storeData
  }

  /**
   *
   * @param {StoreData} data
   * @returns {Promise<Store>}
   */
  async save(data) {
    /** @type {Data['delegations']} */
    const dels = []

    for (const [key, value] of data.delegations) {
      dels.push([
        key,
        {
          meta: value.meta,
          delegation: await delegationToString(value.delegation),
        },
      ])
    }
    /** @type {Data} */
    const encodedData = {
      currentSpace: data.currentSpace || undefined,
      spaces: [...data.spaces.entries()],
      meta: data.meta,
      principal: Signer.format(data.principal),
      delegations: dels,
    }

    this.#config.set(encodedData)

    return this
  }

  /** @type {Store['load']} */
  async load() {
    const data = this.#config.store

    /** @type {StoreData['delegations']} */
    const dels = new Map()

    for (const [key, value] of data.delegations) {
      dels.set(key, {
        delegation: await stringToDelegation(value.delegation),
        meta: value.meta,
      })
    }
    /** @type {StoreData} */
    return {
      principal: Signer.parse(data.principal),
      currentSpace: data.currentSpace === null ? undefined : data.currentSpace,
      meta: data.meta,
      spaces: new Map(data.spaces),
      delegations: dels,
    }
  }
}

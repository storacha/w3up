/* eslint-disable jsdoc/check-indentation */
import Conf from 'conf'
import { Signer } from '@ucanto/principal/ed25519'
import { delegationToString, stringToDelegation } from '../encoding.js'
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'

/**
 * @typedef {import('./types').StoreData<Signer.EdSigner>} StoreData
 * @typedef {import('./types').Store<Signer.EdSigner>} Store
 * @typedef {{
 *    meta: import('../types.js').AgentMeta
 *    principal: string
 *    currentAccount?: Ucanto.DID
 *    accs: Array<[Ucanto.DID, import('./types').AccountMeta]>
 *    dels: Array<[import('./types').CIDString, {
 *      meta?: import('./types').DelegationMeta,
 *      delegation: import('../types.js').EncodedDelegation
 *    }]>
 * }} Data
 */

/**
 * Store implementation with "conf"
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
      accs: data.accs || new Map(),
      dels: data.dels || new Map(),
      principal,
      currentAccount: data.currentAccount,
    }

    await this.save(storeData)
    return storeData
  }

  /**
   *
   * @param {StoreData} data
   */
  async save(data) {
    /** @type {Data['dels']} */
    const dels = []

    for (const [key, value] of data.dels) {
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
      currentAccount: data.currentAccount,
      accs: [...data.accs.entries()],
      meta: data.meta,
      principal: Signer.format(data.principal),
      dels,
    }

    this.#config.set(encodedData)

    return this
  }

  /** @type {Store['load']} */
  async load() {
    const data = this.#config.store

    /** @type {StoreData['dels']} */
    const dels = new Map()

    for (const [key, value] of data.dels) {
      dels.set(key, {
        delegation: await stringToDelegation(value.delegation),
        meta: value.meta,
      })
    }
    /** @type {StoreData} */
    return {
      principal: Signer.parse(data.principal),
      currentAccount: data.currentAccount,
      meta: data.meta,
      accs: new Map(data.accs),
      dels,
    }
  }
}

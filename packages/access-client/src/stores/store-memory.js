import { Signer } from '@ucanto/principal/ed25519'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'

/**
 * @typedef {import('./types').StoreData<Signer.EdSigner>} StoreData
 * @typedef {import('./types').Store<Signer.EdSigner>} Store
 */

/**
 * Store implementation with "conf"
 *
 * @implements {Store}
 */
export class StoreMemory {
  constructor() {
    /** @type {StoreData} */
    // @ts-ignore
    this.data = {}
  }

  async open() {
    return this
  }

  async close() {}

  async reset() {
    // @ts-ignore
    this.data = {}
  }

  async exists() {
    return this.data.meta !== undefined && this.data.principal !== undefined
  }

  /**
   *
   * @param {Partial<StoreData>} [data]
   */
  static async create(data = {}) {
    const store = new StoreMemory()
    await store.init(data)

    return store
  }

  /** @type {Store['init']} */
  async init(data) {
    const principal = data.principal || (await Signer.generate())
    /** @type {StoreData} */
    const storeData = {
      meta: data.meta || { name: 'agent', type: 'device' },
      principal,
      accs: data.accs || new Map(),
      dels: data.dels || new Map(),
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
    this.data = {
      ...data,
    }
    return this
  }

  /** @type {Store['load']} */
  async load() {
    /** @type {StoreData} */
    return this.data
  }
}

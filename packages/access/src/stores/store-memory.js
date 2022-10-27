import { Signer } from '@ucanto/principal/ed25519'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'
import { Delegations } from '../delegations.js'

/**
 * @typedef {import('./types').DelegationsAsJSON} DelegationsAsJSON
 * @typedef {import('./types').StoreDataKeyEd} StoreData
 * @typedef {import('./types').StoreKeyEd} Store
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

  static async create() {
    const store = new StoreMemory()
    await store.init({})

    return store
  }

  /** @type {Store['init']} */
  async init(data) {
    const principal = data.principal || (await Signer.generate())
    const delegations =
      data.delegations ||
      new Delegations({
        principal,
      })
    /** @type {StoreData} */
    const storeData = {
      accounts: data.accounts || [],
      meta: data.meta || { name: 'agent', type: 'device' },
      principal,
      delegations,
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

  async createAccount() {
    return await Signer.generate()
  }
}

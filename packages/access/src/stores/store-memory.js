import { SigningPrincipal } from '@ucanto/principal'
// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'
import { Delegations } from '../delegations.js'

/**
 * @typedef {import('./types').DelegationsAsJSON} DelegationsAsJSON
 */

/**
 * @template T
 * @typedef {import('./types').StoreData<237>} StoreData
 */

/**
 * @template T
 * @typedef {import('./types').Store<237>} Store
 */

/**
 * Store implementation with "conf"
 *
 * @implements {Store<237>}
 */
export class StoreMemory {
  constructor() {
    /** @type {StoreData<237>} */
    // @ts-ignore
    this.data = {}
  }

  async open() {
    return this
  }

  async close() {}

  async exists() {
    return this.data.meta !== undefined && this.data.agent !== undefined
  }

  static async create() {
    const store = new StoreMemory()
    await store.init({})

    return store
  }

  /** @type {Store<237>['init']} */
  async init(data) {
    const principal = data.agent || (await SigningPrincipal.generate())
    const delegations =
      data.delegations ||
      new Delegations({
        principal,
      })
    /** @type {StoreData<237>} */
    const storeData = {
      accounts: data.accounts || [],
      meta: data.meta || { name: 'agent', type: 'device' },
      agent: principal,
      delegations,
    }

    await this.save(storeData)
    return storeData
  }

  /**
   *
   * @param {StoreData<237>} data
   */
  async save(data) {
    this.data = {
      ...data,
    }
    return this
  }

  /** @type {Store<237>['load']} */
  async load() {
    /** @type {StoreData<237>} */
    return this.data
  }

  async createAccount() {
    return await SigningPrincipal.generate()
  }
}

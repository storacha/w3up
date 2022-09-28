import Conf from 'conf'
import { SigningPrincipal } from '@ucanto/principal'
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'
import { Delegations } from '../delegations.js'
import { decodeDelegations, encodeDelegations } from '../encoding.js'

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
export class StoreConf {
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

  async exists() {
    return this.#config.has('meta') && this.#config.has('principal')
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
    this.setAccounts(data.accounts)
    this.setDelegations(data.delegations)
    this.setMeta(data.meta)
    this.setPrincipal(data.agent)
    return this
  }

  /** @type {Store<237>['load']} */
  async load() {
    /** @type {StoreData<237>} */
    return {
      accounts: await this.getAccounts(),
      meta: await this.getMeta(),
      agent: await this.getPrincipal(),
      delegations: await this.getDelegations(),
    }
  }

  async createAccount() {
    return await SigningPrincipal.generate()
  }

  /**
   *
   * @param {import('../types').AgentMeta} meta
   */
  async setMeta(meta) {
    this.#config.set('meta', meta)
    return meta
  }

  /**
   * @param {Types.SigningPrincipal<237>} [principal]
   */
  async setPrincipal(principal) {
    let signer = principal
    if (!signer) {
      signer = await SigningPrincipal.generate()
    }
    this.#config.set('principal', SigningPrincipal.format(signer))
    return signer
  }

  async getPrincipal() {
    const raw = this.#config.get('principal')
    return SigningPrincipal.parse(/** @type {string} */ (raw))
  }

  async getMeta() {
    const raw = this.#config.get('meta')

    return /** @type {import('../awake/types').PeerMeta} */ (raw)
  }

  /**
   * @param {Delegations} delegations
   */
  async setDelegations(delegations) {
    const data = {
      created: await encodeDelegations(delegations.created),
      received: await encodeDelegations(delegations.received),
      meta: [...delegations.meta.entries()],
    }

    this.#config.set('delegations', data)

    return delegations
  }

  async getDelegations() {
    const data = /** @type {DelegationsAsJSON} */ (
      this.#config.get('delegations')
    )
    return new Delegations({
      principal: await this.getPrincipal(),
      created: await decodeDelegations(data.created || ''),
      received: await decodeDelegations(data.received || ''),
      meta: new Map(data.meta),
    })
  }

  /**
   *
   * @param {Types.SigningPrincipal<237>[]} accounts
   */
  async setAccounts(accounts) {
    const encoded = []
    for (const acc of accounts) {
      encoded.push(SigningPrincipal.format(acc))
    }

    this.#config.set('accounts', encoded)

    return accounts
  }

  async getAccounts() {
    const encoded = /** @type {string[]} */ (this.#config.get('accounts'))
    /** @type {Types.SigningPrincipal<237>[]} */
    const accounts = []

    if (!Array.isArray(encoded)) {
      return accounts
    }
    for (const acc of encoded) {
      accounts.push(SigningPrincipal.parse(acc))
    }

    return accounts
  }
}

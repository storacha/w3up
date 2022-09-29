import Conf from 'conf'
import { Signer } from '@ucanto/principal/ed25519'
import { Delegations } from '../delegations.js'
import { decodeDelegations, encodeDelegations } from '../encoding.js'

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

  /** @type {Store['init']} */
  async init(data) {
    const principal = data.agent || (await Signer.generate())
    const delegations =
      data.delegations ||
      new Delegations({
        principal,
      })
    /** @type {StoreData} */
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
   * @param {StoreData} data
   */
  async save(data) {
    this.setAccounts(data.accounts)
    this.setDelegations(data.delegations)
    this.setMeta(data.meta)
    this.setPrincipal(data.agent)
    return this
  }

  /** @type {Store['load']} */
  async load() {
    /** @type {StoreData} */
    return {
      accounts: await this.getAccounts(),
      meta: await this.getMeta(),
      agent: await this.getPrincipal(),
      delegations: await this.getDelegations(),
    }
  }

  async createAccount() {
    return await Signer.generate()
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
   * @param {Signer.Signer} [principal]
   */
  async setPrincipal(principal) {
    let signer = principal
    if (!signer) {
      signer = await Signer.generate()
    }
    this.#config.set('principal', Signer.format(signer))
    return signer
  }

  async getPrincipal() {
    const raw = this.#config.get('principal')
    return Signer.parse(/** @type {string} */ (raw))
  }

  async getMeta() {
    const raw = this.#config.get('meta')

    return /** @type {import('../types').AgentMeta} */ (raw)
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
   * @param {Signer.Signer[]} accounts
   */
  async setAccounts(accounts) {
    const encoded = []
    for (const acc of accounts) {
      encoded.push(Signer.format(acc))
    }

    this.#config.set('accounts', encoded)

    return accounts
  }

  async getAccounts() {
    const encoded = /** @type {string[]} */ (this.#config.get('accounts'))
    /** @type {Signer.Signer[]} */
    const accounts = []

    if (!Array.isArray(encoded)) {
      return accounts
    }
    for (const acc of encoded) {
      accounts.push(Signer.parse(acc))
    }

    return accounts
  }
}

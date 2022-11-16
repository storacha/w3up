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

  async reset() {
    this.#config.clear()
  }

  async exists() {
    return this.#config.has('meta') && this.#config.has('principal')
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
    this.setAccounts(data.accounts)
    this.setDelegations(data.delegations)
    this.setMeta(data.meta)
    this.setPrincipal(data.principal)
    return this
  }

  /** @type {Store['load']} */
  async load() {
    /** @type {StoreData} */
    return {
      accounts: await this.getAccounts(),
      meta: await this.getMeta(),
      principal: await this.getPrincipal(),
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
   * @param {Signer.EdSigner} [principal]
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
    const delegations = new Delegations({
      principal: await this.getPrincipal(),
      created: await decodeDelegations(data.created || ''),
      meta: new Map(data.meta),
    })

    await delegations.addMany(await decodeDelegations(data.received || ''))

    return delegations
  }

  /**
   *
   * @param {Signer.EdSigner[]} accounts
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
    /** @type {Signer.EdSigner[]} */
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

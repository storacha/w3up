import Conf from 'conf'
import { SigningPrincipal } from '@ucanto/principal'
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'
import { Delegations } from '../delegations.js'
import { decodeDelegations, encodeDelegations } from '../encoding.js'

/**
 * @typedef {{
 * created: string;
 * received: string
 * meta: [string, import('../awake/types').PeerMeta] []
 * }} DelegationsRaw
 */

/**
 * Store implementation with "conf"
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
  }

  async open() {
    return this
  }

  async isSetup() {
    return this.#config.has('meta')
  }

  /**
   *
   * @param {import('../awake/types').PeerMeta} meta
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
    const data = /** @type {DelegationsRaw} */ (this.#config.get('delegations'))
    return new Delegations({
      principal: await this.getPrincipal(),
      created: await decodeDelegations(data.created || ''),
      received: await decodeDelegations(data.received || ''),
      meta: new Map(data.meta),
    })
  }

  async newAccount() {
    return await SigningPrincipal.generate()
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
    /** @type {Types.SigningPrincipal[]} */
    const accounts = []

    if (!Array.isArray(encoded)) {
      return accounts
    }
    for (const acc of encoded) {
      accounts.push(SigningPrincipal.parse(acc))
    }

    return accounts
  }

  /**
   *
   * @param {import('../agent').Agent} agent
   */
  async save(agent) {
    if (
      !agent.meta ||
      !agent.delegations ||
      !agent.principal ||
      !agent.accounts
    ) {
      throw new Error('Agent is not yet setup.')
    }
    // @ts-ignore
    this.setAccounts(agent.accounts)
    this.setDelegations(agent.delegations)
    this.setMeta(agent.meta)
    this.setPrincipal(agent.principal)
  }
}

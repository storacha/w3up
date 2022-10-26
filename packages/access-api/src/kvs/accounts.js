// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import { delegationToString } from '@web3-storage/access/encoding'

/**
 * @typedef {{account: string, proof: string}} AccountValue
 * @typedef {import('@web3-storage/access/types').Account} Account
 */

/**
 * Accounts
 */
export class Accounts {
  /**
   *
   * @param {KVNamespace} kv
   * @param {import('workers-qb').D1QB} db
   */
  constructor(kv, db) {
    this.kv = kv
    this.db = db
  }

  /**
   * @param {import('@web3-storage/access/capabilities/types').VoucherRedeem} capability
   * @param {Ucanto.Invocation<import('@web3-storage/access/capabilities/types').VoucherRedeem>} invocation
   */
  async create(capability, invocation) {
    await this.db.insert({
      tableName: 'accounts',
      data: {
        did: capability.nb.account,
        product: capability.nb.product,
        email: capability.nb.identity.replace('mailto:', ''),
        agent: invocation.issuer.did(),
      },
    })
  }

  /**
   * Get account by DID
   *
   * @param {string} did
   */
  async get(did) {
    const { results } = await this.db.fetchOne({
      tableName: 'accounts',
      fields: '*',
      where: {
        conditions: 'did =?1',
        params: [did],
      },
    })

    if (!results) {
      return
    }

    return /** @type {Account} */ ({
      did: results.did,
      agent: results.agent,
      email: results.email,
      product: results.product,
      updated_at: results.update_at,
      inserted_at: results.inserted_at,
    })
  }

  /**
   * @param {string} email
   * @param {Ucanto.Delegation<Ucanto.Capabilities>} delegation
   */
  async saveAccount(email, delegation) {
    const accs = await this.kv.get(email)

    // eslint-disable-next-line no-console
    console.log(
      '🚀 ~ file: accounts.js ~ line 76 ~ Accounts ~ saveAccount ~ accs',
      accs
    )
    if (accs) {
      const parsed = JSON.parse(accs)
      parsed.push(await delegationToString(delegation))
      await this.kv.put(email, JSON.stringify(accs))
    } else {
      await this.kv.put(
        email,
        JSON.stringify([await delegationToString(delegation)])
      )
    }
  }

  /**
   * @param {string} email
   */
  async hasAccounts(email) {
    const r = await this.kv.get(email)
    // eslint-disable-next-line no-console
    console.log(
      '🚀 ~ file: accounts.js ~ line 97 ~ Accounts ~ hasAccounts ~ r',
      r
    )
    return Boolean(r)
  }
}

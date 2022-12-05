// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import {
  delegationToString,
  stringToDelegation,
} from '@web3-storage/access/encoding'

/**
 * @typedef {import('@web3-storage/access/types').SpaceD1} SpaceD1
 */

/**
 * @implements {Ucanto.Failure}
 */
export class D1Error extends Error {
  /** @type {true} */
  get error() {
    return true
  }

  /**
   *
   * @param {import('../bindings').D1ErrorRaw} error
   */
  constructor(error) {
    super(`${error.cause.message} (${error.cause.code})`, {
      cause: error.cause,
    })
    this.name = 'D1Error'
    this.code = error.cause.code
  }
}

/**
 * Spaces
 */
export class Spaces {
  /**
   *
   * @param {import('workers-qb').D1QB} db
   */
  constructor(db) {
    this.db = db
  }

  /**
   * @param {import('@web3-storage/capabilities/types').VoucherRedeem} capability
   * @param {Ucanto.Invocation<import('@web3-storage/capabilities/types').VoucherRedeem>} invocation
   * @param {Ucanto.Delegation<[import('@web3-storage/access/src/types').Top]> | undefined} delegation
   */
  async create(capability, invocation, delegation) {
    try {
      const result = await this.db.insert({
        tableName: 'spaces',
        data: {
          did: capability.nb.space,
          product: capability.nb.product,
          email: capability.nb.identity.replace('mailto:', ''),
          agent: invocation.issuer.did(),
          metadata: JSON.stringify(invocation.facts[0]),
          invocation: await delegationToString(invocation),
          // eslint-disable-next-line unicorn/no-null
          delegation: !delegation ? null : await delegationToString(delegation),
        },
      })
      return { data: result }
    } catch (error) {
      return {
        error: new D1Error(
          /** @type {import('../bindings').D1ErrorRaw} */ (error)
        ),
      }
    }
  }

  /**
   * Get space by DID
   *
   * @param {string} did
   */
  async get(did) {
    const { results } = await this.db.fetchOne({
      tableName: 'spaces',
      fields: '*',
      where: {
        conditions: 'did=?1',
        params: [did],
      },
    })

    if (!results) {
      return
    }

    return /** @type {SpaceD1} */ ({
      did: results.did,
      agent: results.agent,
      email: results.email,
      product: results.product,
      updated_at: results.update_at,
      inserted_at: results.inserted_at,
      // @ts-ignore
      metadata: JSON.parse(results.metadata),
    })
  }

  /**
   * @param {string} email
   */
  async getByEmail(email) {
    const s = await this.db.fetchAll({
      tableName: 'spaces',
      fields: '*',
      where: {
        conditions: 'email=?1',
        params: [email],
      },
    })

    if (!s.results || s.results.length === 0) {
      return
    }

    const out = []

    for (const r of s.results) {
      out.push({
        did: r.did,
        agent: r.agent,
        email: r.email,
        product: r.product,
        updated_at: r.update_at,
        inserted_at: r.inserted_at,
        // @ts-ignore
        metadata: JSON.parse(r.metadata),
        delegation: !r.delegation
          ? undefined
          : await stringToDelegation(
              /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/access/types').Top]>} */ (
                r.delegation
              )
            ),
      })
    }
    return out
  }
}

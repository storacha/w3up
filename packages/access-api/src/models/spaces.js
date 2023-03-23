// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import { delegationToString } from '@web3-storage/access/encoding'
import { Kysely } from 'kysely'
import { D1Dialect } from 'kysely-d1'
import { D1Error, GenericPlugin } from '../utils/d1.js'

/**
 * @typedef {import('@web3-storage/access/src/types.js').SpaceTable} SpaceTable
 */

/**
 * Spaces
 */
export class Spaces {
  /**
   *
   * @param {D1Database} d1
   */
  constructor(d1) {
    /** @type {GenericPlugin<import('kysely').Selectable<SpaceTable>>} */
    const objectPlugin = new GenericPlugin({
      metadata: (v) => {
        // this will be `EMPTY` because it's the default value in the sql schema
        // https://github.com/web3-storage/w3protocol/issues/447
        if (v === 'EMPTY') {
          return
        }
        return JSON.parse(v)
      },
      inserted_at: (v) => new Date(v),
      updated_at: (v) => new Date(v),
    })
    this.d1 = /** @type {Kysely<{ spaces: SpaceTable }>} */ (
      new Kysely({
        dialect: new D1Dialect({ database: d1 }),
        plugins: [objectPlugin],
      })
    )
  }

  /**
   * @param {import('@web3-storage/capabilities/types').VoucherRedeem} capability
   * @param {Ucanto.Invocation<import('@web3-storage/capabilities/types').VoucherRedeem>} invocation
   * @param {Ucanto.Delegation<[import('@web3-storage/access/types').Top]> | undefined} delegation
   */
  async create(capability, invocation, delegation) {
    try {
      const metadata =
        /** @type {import('@web3-storage/access/types').SpaceTableMetadata | undefined} */ (
          /** @type {unknown} */ (invocation.facts[0])
        )
      const result = await this.d1
        .insertInto('spaces')
        .values({
          agent: invocation.issuer.did(),
          did: capability.nb.space,
          email: capability.nb.identity.replace('mailto:', ''),
          invocation: delegationToString(invocation),
          product: capability.nb.product,
          metadata,
          delegation: delegation ? delegationToString(delegation) : undefined,
        })
        .returning('spaces.did')
        .execute()
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
   * @param {Ucanto.URI<"did:">} did
   */
  async get(did) {
    const space = await this.d1
      .selectFrom('spaces')
      .selectAll()
      .where('spaces.did', '=', did)
      .executeTakeFirst()

    if (space) {
      return space
    }
  }

  /**
   * @param {Ucanto.URI<"mailto:">} email
   */
  async getByEmail(email) {
    const spaces = await this.d1
      .selectFrom('spaces')
      .selectAll()
      .where('spaces.email', '=', email.replace('mailto:', ''))
      .execute()

    if (spaces.length === 0) {
      return
    }

    return spaces
  }
}

import * as API from '../types/index.js'
import { Kysely } from 'kysely'
import { GenericPlugin, D1Error } from '../utils/d1.js'
import { D1Dialect } from 'kysely-d1'
import * as Link from '@ucanto/core/link'

/**
 * @implements {API.SubscriptionStore}
 */
export class Subscription {
  /**
   * @param {object} input
   * @param {D1Database} input.d1
   */
  constructor({ d1 }) {
    /** @type {'subscriptions'} */
    this.tableName = 'subscriptions'
    /** @type {API.Database<{ subscriptions: API.Table<API.SubscriptionRecord> }>} */
    this.d1 = new Kysely({
      dialect: new D1Dialect({ database: d1 }),
      plugins: [
        /** @type {GenericPlugin<API.SubscriptionRecord>} */
        new GenericPlugin({
          cause: (v) => Link.parse(v),
          inserted_at: (v) => new Date(v),
          updated_at: (v) => new Date(v),
        }),
      ],
    })
  }

  /**
   * @param {API.Subscription} record
   */
  async add({ cause, provider, customer, provision, order }) {
    try {
      const result = await this.d1
        .insertInto(this.tableName)
        .values({
          provision: provision.toString(),
          cause: cause.toString(),
          provider,
          customer,
          order: order.toString(),
        })
        // inserting same record twice with a different cause is a noop and
        // we just ignore it.
        .onConflict((oc) => oc.constraint('task_cid').doNothing())
        .returning('cause')
        .executeTakeFirstOrThrow()

      return { cause: result.cause }
    } catch (error) {
      return new D1Error(
        /** @type {import('../bindings').D1ErrorRaw} */ (error)
      )
    }
  }

  /**
   * @param {API.SubscriptionQuery} query
   */
  async find({ provider, customer, order }) {
    let query = this.d1.selectFrom(this.tableName).selectAll()
    if (customer) {
      query = query.where('subscriptions.customer', '=', customer)
    }

    if (provider) {
      query = query.where('subscriptions.provider', '=', provider)
    }

    if (order) {
      query = query.where('subscriptions.order', '=', order)
    }

    return await query.execute()
  }
}

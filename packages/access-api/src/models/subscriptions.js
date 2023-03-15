import * as API from '../types/subscriptions.js'
import { Kysely } from 'kysely'
import { GenericPlugin D1Error } from '../utils/d1.js'
import { D1Dialect } from 'kysely-d1'
import * as Link from '@ucanto/core/link'

export class Subscription {
  /**
   * @param {object} input
   * @param {D1Database} input.d1
   */
  constructor({ d1 }) {
    /** @type {'subscriptions'} */
    this.tableName = 'subscriptions'
    /** @type {Kysely<{ subscriptions: API.SubscriptionRecord }>} */
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
  async add({ cause, provider, customer, order }) {
    try {
      return await this.d1
        .insertInto(this.tableName)
        .values({
          cause: cause.toString(),
          provider,
          customer,
          order: order.toString()
        })
        // inserting same record twice with a different cause is a noop and
        // we just ignore it.
        .onConflict((oc) => oc.constraint('task_cid').doNothing())
        .returning(['order', 'provider', 'customer', 'cause'])
        .executeTakeFirstOrThrow()
    } catch (error) {
      return new D1Error(
        /** @type {import('../bindings').D1ErrorRaw} */ (error)
      )
    }
  }
}

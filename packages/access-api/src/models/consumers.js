import * as API from '../types/consumers.js'
import { D1Dialect } from 'kysely-d1'
import { Kysely } from 'kysely'
import { GenericPlugin, D1Error } from '../utils/d1.js'
import * as Link from '@ucanto/core/link'

/**
 * @implements {API.ConsumerStore}
 */
export class Consumers {
  /**
   * @param {object} input
   * @param {API.ConsumerRecord[]} input.records
   */
  constructor({ records }) {
    this.records = records
  }

  /**
   *
   * @param {API.Consumer} record
   */
  async add({ cause, provider, consumer, customer, order }) {
    const matches = this.find({ provider, consumer, customer })
    for await (const match of matches) {
      if (match.order === order) {
        return
      }
    }

    this.records.push({
      subscription: `${order}@${provider}`,
      cause,
      provider,
      consumer,
      customer,
      order,
      inserted_at: new Date(),
      updated_at: new Date(),
    })
  }

  /**
   * @param {API.ConsumerQuery} query
   *
   */
  async *find({ provider, consumer, customer }) {
    yield* this.records.filter((record) => {
      return (
        (!provider || record.provider === provider) &&
        (!consumer || record.consumer === consumer) &&
        (!customer || record.customer === customer)
      )
    })
  }
}

/**
 * @implements {API.ConsumerStore}
 */
export class ConsumerDB {
  /**
   * @param {object} input
   * @param {D1Database} input.d1
   */
  constructor({ d1 }) {
    /** @type {'consumers'} */
    this.tableName = 'consumers'
    /** @type {Kysely<{ consumers: API.ConsumerRecord }>} */
    this.d1 = new Kysely({
      dialect: new D1Dialect({ database: d1 }),
      plugins: [
        /** @type {GenericPlugin<API.ConsumerRecord>} */
        new GenericPlugin({
          cause: (v) => Link.parse(v),
          inserted_at: (v) => new Date(v),
          updated_at: (v) => new Date(v),
        }),
      ],
    })
  }

  /**
   * @param {API.Consumer} record
   */
  async add({ cause, provider, consumer, customer, order }) {
    try {
      const insert = await this.d1
        .insertInto(this.tableName)
        .values({
          cause: cause.toString(),
          provider,
          consumer,
          customer,
          order,
        })
        // inserting same record twice with a different cause is a noop and
        // we just ignore it.
        .onConflict((oc) => oc.constraint('task_cid').doNothing())
        .executeTakeFirstOrThrow()

      return {}
    } catch (error) {
      return new D1Error(
        /** @type {import('../bindings').D1ErrorRaw} */ (error)
      )
    }
  }

  /**
   * @param {API.ConsumerQuery} query
   */
  async *find({ provider, consumer, customer }) {
    let query = this.d1.selectFrom(this.tableName).selectAll()
    if (provider) {
      query = query.where('consumers.provider', '=', provider)
    }

    if (consumer) {
      query = query.where('consumers.consumer', '=', consumer)
    }

    if (customer) {
      query = query.where('consumers.customer', '=', customer)
    }

    const results = await query.execute()

    yield* results
  }
}

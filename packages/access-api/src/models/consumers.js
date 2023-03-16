import * as API from '../types/consumers.js'
import { D1Dialect } from 'kysely-d1'
import { Kysely } from 'kysely'
import { GenericPlugin, D1Error } from '../utils/d1.js'
import * as Link from '@ucanto/core/link'

const time = () => /** @type {API.Timestamp} */ (new Date())

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
   * @param {API.ConsumerAdd} record
   */
  async add({ cause, provider, consumer, order }) {
    const matches = await this.find({ provider, consumer })
    for await (const match of matches) {
      match.order.toString()
      if (match.order.toString() === order.toString()) {
        return { cause: match.cause }
      }
    }

    this.records.push({
      subscription: `${order}@${provider}`,
      cause,
      provider,
      consumer,
      order,
      inserted_at: time(),
      updated_at: time(),
    })

    return { cause }
  }

  /**
   * @param {Omit<API.Consumer, 'cause'>} query
   */
  async remove({ provider, consumer, order }) {
    for (const [offset, record] of this.records.entries()) {
      if (
        record.order.toString() === order.toString() &&
        record.consumer === consumer &&
        record.provider === provider
      ) {
        this.records.splice(offset, 1)

        return { cause: record.cause }
      }
    }
    return {}
  }

  /**
   * @param {API.ConsumerQuery} query
   *
   */
  async find({ provider, consumer, order, customer }) {
    return await this.records.filter((record) => {
      return (
        (!provider || record.provider === provider) &&
        (!consumer || record.consumer === consumer) &&
        (!order || record.order.toString() === order.toString())
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
    /** @type {API.Database<{ consumers: API.Table<API.ConsumerRecord> }>} */
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
   * @param {API.ConsumerAdd} record
   */
  async add({ cause, provider, consumer, order }) {
    try {
      return await this.d1
        .insertInto(this.tableName)
        .values({
          cause: cause.toString(),
          provider,
          consumer,
          order: order.toString(),
        })
        // inserting same record twice with a different cause is a noop and
        // we just ignore it.
        .onConflict((oc) => oc.constraint('task_cid').doNothing())
        .returning('cause')
        .executeTakeFirstOrThrow()
    } catch (error) {
      return new D1Error(
        /** @type {import('../bindings').D1ErrorRaw} */ (error)
      )
    }
  }

  /**
   * @param {API.ConsumerRemove} record
   */
  async remove({ provider, consumer, order }) {
    try {
      const result = await this.d1
        .deleteFrom(this.tableName)
        .where('provider', '=', provider)
        .where('consumer', '=', consumer)
        .where('order', '=', order)
        .returning('cause')
        .executeTakeFirst()
      return result || {}
    } catch (error) {
      return new D1Error(
        /** @type {import('../bindings').D1ErrorRaw} */ (error)
      )
    }
  }

  /**
   * @param {API.ConsumerQuery} query
   */
  async find({ provider, consumer, order }) {
    let query = this.d1.selectFrom(this.tableName).selectAll()
    if (provider) {
      query = query.where('consumers.provider', '=', provider)
    }

    if (consumer) {
      query = query.where('consumers.consumer', '=', consumer)
    }

    if (order) {
      query = query.where('consumers.order', '=', order)
    }

    // if (customer) {
    //   query = query.where('consumers.customer', '=', customer)
    // }

    return await query.execute()
  }
}

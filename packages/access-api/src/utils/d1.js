// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import { Kysely, OperationNodeTransformer } from 'kysely'
import { D1Dialect } from 'kysely-d1'
import { isPlainObject, isDate } from './common.js'

/**
 * @typedef {import('kysely').KyselyPlugin} KyselyPlugin
 */

export class ObjectLikeTransformer extends OperationNodeTransformer {
  /**
   * @param {import('kysely').PrimitiveValueListNode} node
   */
  transformPrimitiveValueList(node) {
    return {
      ...node,
      values: node.values.map((v) => {
        if (isPlainObject(v)) {
          return JSON.stringify(v)
        }

        if (isDate(v)) {
          return v.toISOString()
        }

        return v
      }),
    }
  }

  /**
   * @param {import('kysely').ValueNode} node
   */
  transformValue(node) {
    if (isPlainObject(node.value)) {
      return { kind: node.kind, value: JSON.stringify(node.value) }
    }

    if (isDate(node.value)) {
      return { kind: node.kind, value: node.value.toISOString() }
    }

    return node
  }
}

/**
 * Plugin to transform queries and results to and from js object types
 *
 * @template R
 * @implements {KyselyPlugin}
 */
export class GenericPlugin {
  /**
   *
   * @param {Partial<{[Key in keyof R]: (value: any) => R[Key]}>} resultTransforms
   */
  constructor(resultTransforms) {
    this.transformer = new ObjectLikeTransformer()
    this.resultTransforms = resultTransforms
  }

  /**
   * Transform result from D1 results into JS instances like JSON strings into objects and date string into Date
   *
   * @param {import('kysely').PluginTransformResultArgs} args
   */
  async transformResult(args) {
    if (args.result.rows && Array.isArray(args.result.rows)) {
      return {
        ...args.result,
        rows: args.result.rows.map((row) => {
          const custom = {}
          for (const [key, value] of Object.entries(row)) {
            // @ts-ignore
            if (this.resultTransforms[key]) {
              // @ts-ignore
              custom[key] = this.resultTransforms[key](value)
            }
          }

          return {
            ...row,
            ...custom,
          }
        }),
      }
    }

    return args.result
  }

  /**
   * Transforms objects in the query into string with JSON.stringify
   *
   * @param {import('kysely').PluginTransformQueryArgs} args
   * @returns
   */
  transformQuery(args) {
    return this.transformer.transformNode(args.node)
  }
}

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
    super(
      `${error.cause ? error.cause.message : error.message} (${
        error.cause ? error.cause.code : ''
      })`,
      {
        cause: error.cause,
      }
    )
    this.name = 'D1Error'
    this.code = error.cause.code
  }
}

/**
 * @template S
 * @param {D1Database} d1
 * @param {Record<string, (v: unknown) => unknown>} [resultTransforms]
 * @returns {import('../types/database.js').Database<S>}
 */
export function createD1Database(d1, resultTransforms = {}) {
  /** @type {Kysely<S>} */
  const kdb = new Kysely({
    dialect: new D1Dialect({ database: d1 }),
    plugins: [
      new GenericPlugin({
        // eslint-disable-next-line unicorn/no-null
        expires_at: (v) => (typeof v === 'string' ? new Date(v) : null),
        inserted_at: (v) => new Date(v),
        updated_at: (v) => new Date(v),
        ...resultTransforms,
      }),
    ],
  })
  const db = Object.assign(kdb, {
    canStream: false,
  })
  return db
}

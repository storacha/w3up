// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import { OperationNodeTransformer } from 'kysely'
import { isObject } from './common.js'

/**
 * @typedef {import('kysely').KyselyPlugin} KyselyPlugin
 */

export class JsonTransformer extends OperationNodeTransformer {
  /**
   * @param {import('kysely').PrimitiveValueListNode} node
   */
  transformPrimitiveValueList(node) {
    return {
      ...node,
      values: node.values.map((v) => {
        return isObject(v) ? JSON.stringify(v) : v
      }),
    }
  }
}

/**
 * Plugin to transform queries and results for the Space table
 *
 * @implements {KyselyPlugin}
 */
export class SpacePlugin {
  constructor() {
    this.transformer = new JsonTransformer()
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
          if (row.metadata) {
            // @ts-ignore
            custom.metadata = JSON.parse(row.metadata)
          }
          if (row.inserted_at) {
            // @ts-ignore
            custom.inserted_at = new Date(row.inserted_at)
          }
          if (row.updated_at) {
            // @ts-ignore
            custom.updated_at = new Date(row.updated_at)
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

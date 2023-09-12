import * as Types from './types.js'
import * as Get from './shard/get.js'

/**
 * @param {Types.ShardServiceContext} context
 */
export const createService = (context) => ({
  get: Get.provide(context),
})

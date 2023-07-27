import * as Types from './types.js'
import * as Has from './consumer/has.js'
import * as Get from './consumer/get.js'

/**
 * @param {Types.ConsumerServiceContext} context
 */
export const createService = (context) => ({
  has: Has.provide(context),
  get: Get.provide(context),
})

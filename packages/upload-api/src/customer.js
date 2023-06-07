import * as Types from './types.js'
import * as Get from './customer/get.js'

/**
 * @param {Types.CustomerServiceContext} context
 */
export const createService = (context) => ({
  get: Get.provide(context),
})

import * as Types from './types.js'
import * as Get from './subscription/get.js'
import * as List from './subscription/list.js'

/**
 * @param {Types.SubscriptionServiceContext} context
 */
export const createService = (context) => ({
  get: Get.provide(context),
  list: List.provide(context),
})

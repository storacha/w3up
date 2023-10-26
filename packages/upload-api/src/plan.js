import * as Types from './types.js'
import * as Get from './plan/get.js'

/**
 * @param {Types.PlanServiceContext} context
 */
export const createService = (context) => ({
  get: Get.provide(context),
})

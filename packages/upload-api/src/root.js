import * as Types from './types.js'
import * as Get from './root/get.js'

/**
 * @param {Types.RootServiceContext} context
 */
export const createService = (context) => ({
  get: Get.provide(context),
})

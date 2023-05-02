import * as API from '../api.js'
import * as Get from './customer/get.js'

/**
 * @param {API.RouteContext} context
 */
export const provide = (context) => ({
  get: Get.provide(context),
})

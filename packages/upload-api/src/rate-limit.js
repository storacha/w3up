import * as Types from './types.js'
import * as Add from './rate-limit/add.js'
import * as Remove from './rate-limit/remove.js'
import * as List from './rate-limit/list.js'

/**
 * @param {Types.RateLimitServiceContext} context
 */
export const createService = (context) => ({
  add: Add.provide(context),
  remove: Remove.provide(context),
  list: List.provide(context),
})

import * as Types from './types.js'
import * as Add from './provider-add.js'

/**
 * @param {Types.ProviderServiceContext} context
 */
export const createService = (context) => ({
  add: Add.provide(context),
})

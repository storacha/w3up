import * as Types from './types.js'
import * as StoreInspect from './admin/store/inspect.js'
import * as UploadInspect from './admin/upload/inspect.js'

/**
 * @param {Types.AdminServiceContext} context
 */
export const createService = (context) => ({
  store: {
    inspect: StoreInspect.provide(context),
  },

  upload: {
    inspect: UploadInspect.provide(context)
  }
})

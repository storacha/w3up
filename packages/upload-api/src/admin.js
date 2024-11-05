import * as Types from './types.js'
import * as UploadInspect from './admin/upload/inspect.js'

/**
 * @param {Types.AdminServiceContext} context
 */
export const createService = (context) => ({
  upload: {
    inspect: UploadInspect.provide(context),
  },
})

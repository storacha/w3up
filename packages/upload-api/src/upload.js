import { uploadAddProvider } from './upload/add.js'
import { uploadListProvider } from './upload/list.js'
import { uploadRemoveProvider } from './upload/remove.js'
import * as API from './types.js'

/**
 * @param {API.UploadServiceContext} context
 */
export function createService(context) {
  return {
    add: uploadAddProvider(context),
    list: uploadListProvider(context),
    remove: uploadRemoveProvider(context),
  }
}

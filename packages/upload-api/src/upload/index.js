import { uploadAddProvider } from './add.js'
import { uploadListProvider } from './list.js'
import { uploadRemoveProvider } from './remove.js'
import * as API from '../types.js'

/**
 * @param {API.UploadServiceContext} context
 */
export function createUploadService(context) {
  return {
    add: uploadAddProvider(context),
    list: uploadListProvider(context),
    remove: uploadRemoveProvider(context),
  }
}

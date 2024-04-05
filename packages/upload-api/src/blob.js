import { blobAddProvider } from './blob/add.js'
import * as API from './types.js'

/**
 * @param {API.BlobServiceContext} context
 */
export function createService(context) {
  return {
    add: blobAddProvider(context),
  }
}

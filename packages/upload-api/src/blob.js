import { blobAddProvider } from './blob/add.js'
import { blobListProvider } from './blob/list.js'
import { blobRemoveProvider } from './blob/remove.js'
import { blobGetProvider } from './blob/get.js'
import * as API from './types.js'

export { BlobNotFound } from './blob/lib.js'

/**
 * @param {API.BlobServiceContext} context
 */
export function createService(context) {
  return {
    add: blobAddProvider(context),
    list: blobListProvider(context),
    remove: blobRemoveProvider(context),
    get: {
      0: {
        1: blobGetProvider(context),
      },
    },
  }
}

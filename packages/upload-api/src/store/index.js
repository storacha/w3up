import { storeAddProvider } from './add.js'
import { storeListProvider } from './list.js'
import { storeRemoveProvider } from './remove.js'
import * as API from '../types.js'

/**
 * @param {API.StoreServiceContext} context
 */
export function createStoreService(context) {
  return {
    add: storeAddProvider(context),
    list: storeListProvider(context),
    remove: storeRemoveProvider(context),
  }
}

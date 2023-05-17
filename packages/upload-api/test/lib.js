import * as Store from './store.js'
import * as Upload from './upload.js'
import { testVariant as testDelegationsStorageVariant } from './delegations-storage-tests.js'
import { testVariant as testProvisionsStorageVariant } from './provisions-storage-tests.js'

export * from './util.js'

export const test = {
  ...Store.test,
  ...Upload.test,
}

export {
  Store,
  Upload,
  testDelegationsStorageVariant,
  testProvisionsStorageVariant
}

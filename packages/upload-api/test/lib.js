import * as Store from './store.js'
import * as Upload from './upload.js'
import { test as delegationsStorageTests } from './storage/delegations-storage-tests.js'
import { test as provisionsStorageTests } from './storage/provisions-storage-tests.js'
import { test as rateLimitsStorageTests } from './storage/rate-limits-storage-tests.js'
import { DebugEmail } from '../src/utils/email.js'

export * from './util.js'

export const test = {
  ...Store.test,
  ...Upload.test,
}

export {
  Store,
  Upload,
  delegationsStorageTests,
  provisionsStorageTests,
  rateLimitsStorageTests,
  DebugEmail,
}

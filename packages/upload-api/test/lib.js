import * as Store from './store.js'
import * as Upload from './upload.js'
import { test as delegationsStorageTests } from './delegations-storage-tests.js'
import { test as provisionsStorageTests } from './provisions-storage-tests.js'
import { test as rateLimitsStorageTests } from './rate-limits-storage-tests.js'
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

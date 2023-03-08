import * as Store from './store.js'
import * as Upload from './upload.js'
export * from './util.js'

export const test = {
  ...Store.test,
  ...Upload.test,
}

export { Store, Upload }

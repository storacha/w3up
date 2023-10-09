import { ucanRevokeProvider } from './ucan/revoke.js'
import * as API from './types.js'

/**
 * @param {API.UploadServiceContext} context
 */
export const createService = (context) => {
  return {
    revoke: ucanRevokeProvider(context),
  }
}

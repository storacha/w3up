import { ucanRevokeProvider } from './ucan/revoke.js'
import { ucanReceiptProvider } from './ucan/receipt.js'
import * as API from './types.js'

/**
 * @param {API.UploadServiceContext} context
 */
export const createService = (context) => {
  return {
    revoke: ucanRevokeProvider(context),
    receipt: ucanReceiptProvider(context),
  }
}

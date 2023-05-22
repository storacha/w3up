import { offerArrangeProvider } from './offer/arrange.js'
import * as API from './types.js'

/**
 * @param {API.OfferServiceContext} context
 */
export function createService(context) {
  return {
    arrange: offerArrangeProvider(context),
  }
}

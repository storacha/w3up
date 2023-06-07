import { provide as aggregateOfferProvider } from './aggregate/offer.js'
import { provide as aggregateGetProvider } from './aggregate/get.js'
import * as API from './types.js'

/**
 * @param {API.AggregateServiceContext} context
 */
export function createService(context) {
  return {
    offer: aggregateOfferProvider(context),
    get: aggregateGetProvider(context),
  }
}

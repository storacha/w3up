import * as AggregatorService from './services/aggregator.js'
import * as DealerService from './services/dealer.js'
import * as StorefrontService from './services/storefront.js'

export * from './utils.js'

export const test = {
  service: {
    ...AggregatorService.test,
    ...DealerService.test,
    ...StorefrontService.test,
  },
  events: {},
}

import * as StorefrontService from './services/storefront.js'
import * as AggregatorService from './services/aggregator.js'
import * as DealerService from './services/dealer.js'
import * as DealTrackerService from './services/deal-tracker.js'

import * as StorefrontEvents from './events/storefront.js'
import * as AggregatorEvents from './events/aggregator.js'
import * as DealerEvents from './events/dealer.js'

export * from './utils.js'

export const test = {
  service: {
    storefront: {
      ...StorefrontService.test,
    },
    aggregator: {
      ...AggregatorService.test,
    },
    dealer: {
      ...DealerService.test,
    },
    dealTracker: {
      ...DealTrackerService.test,
    },
  },
  events: {
    storefront: {
      ...StorefrontEvents.test,
    },
    aggregator: {
      ...AggregatorEvents.test,
    },
    dealer: {
      ...DealerEvents.test,
    },
  },
}

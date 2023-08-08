import * as Aggregator from './services/aggregator.js'
import * as Dealer from './services/dealer.js'
import * as Storefront from './services/storefront.js'
export * from './utils.js'

export const test = {
  ...Aggregator.test,
  ...Dealer.test,
  ...Storefront.test,
}

export { Aggregator, Dealer, Storefront }

import * as Aggregator from './services/aggregator.js'
import * as Broker from './services/broker.js'
import * as Storefront from './services/storefront.js'
export * from './utils.js'

export const test = {
  ...Aggregator.test,
  ...Broker.test,
  ...Storefront.test,
}

export { Aggregator, Broker, Storefront }

import * as Provider from './provider.js'
import * as Space from './space.js'
import * as Top from './top.js'
import * as Store from './store.js'
import * as Upload from './upload.js'
import * as Access from './access.js'
import * as Utils from './utils.js'
import * as Consumer from './consumer.js'
import * as Customer from './customer.js'
import * as Console from './console.js'
import * as RateLimit from './rate-limit.js'
import * as Subscription from './subscription.js'
import * as Filecoin from './filecoin.js'

export {
  Access,
  Provider,
  Space,
  Top,
  Store,
  Upload,
  Consumer,
  Customer,
  Console,
  Utils,
  RateLimit,
  Subscription,
  Filecoin,
}

/** @type {import('./types.js').AbilitiesArray} */
export const abilitiesAsStrings = [
  Top.top.can,
  Provider.add.can,
  Space.space.can,
  Space.info.can,
  Upload.upload.can,
  Upload.add.can,
  Upload.remove.can,
  Upload.list.can,
  Store.store.can,
  Store.add.can,
  Store.remove.can,
  Store.list.can,
  Access.access.can,
  Access.authorize.can,
  Access.session.can,
  Customer.get.can,
  Consumer.has.can,
  Consumer.get.can,
  Subscription.get.can,
  RateLimit.add.can,
  RateLimit.remove.can,
  RateLimit.list.can,
  Filecoin.filecoinQueue.can,
  Filecoin.filecoinAdd.can,
  Filecoin.aggregateQueue.can,
  Filecoin.aggregateAdd.can,
  Filecoin.dealQueue.can,
  Filecoin.dealAdd.can,
  Filecoin.chainTrackerInfo.can,
]

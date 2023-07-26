import * as Provider from './provider.js'
import * as Space from './space.js'
import * as Top from './top.js'
import * as Store from './store.js'
import * as Upload from './upload.js'
import * as Voucher from './voucher.js'
import * as Access from './access.js'
import * as Utils from './utils.js'
import * as Consumer from './consumer.js'
import * as Customer from './customer.js'
import * as Console from './console.js'
import * as Offer from './offer.js'
import * as Aggregate from './aggregate.js'
import * as RateLimit from './rate-limit.js'
import * as Subscription from './subscription.js'

export {
  Access,
  Provider,
  Space,
  Top,
  Store,
  Upload,
  Voucher,
  Consumer,
  Customer,
  Console,
  Utils,
  Aggregate,
  Offer,
  RateLimit,
  Subscription,
}

/** @type {import('./types.js').AbilitiesArray} */
export const abilitiesAsStrings = [
  Top.top.can,
  Provider.add.can,
  Space.space.can,
  Space.info.can,
  Space.recover.can,
  Space.recoverValidation.can,
  Upload.upload.can,
  Upload.add.can,
  Upload.remove.can,
  Upload.list.can,
  Store.store.can,
  Store.add.can,
  Store.remove.can,
  Store.list.can,
  Voucher.claim.can,
  Voucher.redeem.can,
  Access.access.can,
  Access.authorize.can,
  Access.session.can,
  Aggregate.offer.can,
  Aggregate.get.can,
  Offer.arrange.can,
  Customer.get.can,
  Consumer.has.can,
  Consumer.get.can,
  Subscription.get.can,
  RateLimit.add.can,
  RateLimit.remove.can,
  RateLimit.list.can,
]

import * as API from '../api.js'
import * as uploadApi from './upload-api-proxy.js'
import * as Access from './access.js'
import * as Consumer from './consumer.js'
import * as Customer from './customer.js'
import * as Provider from './provider.js'
import * as Voucher from './voucher.js'
import * as Space from './space.js'
import * as Console from './console.js'

/**
 * @param {API.RouteContext} ctx
 * @returns {API.Service}
 */
export const provide = (ctx) => ({
  store: uploadApi.createStoreProxy(ctx),
  upload: uploadApi.createUploadProxy(ctx),
  access: Access.provide(ctx),
  provider: Provider.provide(ctx),
  voucher: Voucher.provide(ctx),
  space: Space.provide(ctx),
  consumer: Consumer.provide(ctx),
  customer: Customer.provide(ctx),
  console: Console.provide(ctx),
})

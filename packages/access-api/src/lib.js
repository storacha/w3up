import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import * as Types from './types.js'
import * as CAR from '@ucanto/transport/car'
import { createService as createAccessService } from './access.js'
import { createService as createConsoleService } from './console.js'
import { createService as createConsumerService } from './consumer.js'
import { createService as createCustomerService } from './customer.js'
import { createService as createProviderService } from './provider.js'
import { createService as createSpaceService } from './space.js'
import * as API from './api.js'
export * from './api.js'


/**
 * @param {API.UcantoServerContext} options
 */
export const createServer = ({ id, codec = CAR.inbound, ...context }) =>
  Server.create({
    id,
    codec,
    service: createService(context),
    catch: (error) => context.errorReporter.catch(error),
  })

/**
 * @param {API.ServiceContext} context
 */
export const createService = (context) => ({
  access: createAccessService(context),
  console: createConsoleService(context),
  consumer: createConsumerService(context),
  customer: createCustomerService(context),
  provider: createProviderService(context),
  space: createSpaceService(context)
})

/**
 * @param {object} options
 * @param {Types.Principal} options.id
 * @param {Types.Transport.Channel<Types.Service>} options.channel
 * @param {Types.OutboundCodec} [options.codec]
 */
export const connect = ({ id, channel, codec = CAR.outbound }) =>
  Client.connect({
    id,
    channel,
    codec,
  })

export {
  createService as createAccessService,
  createServer as createAccessServer,
  connect as createAccessClient,
}

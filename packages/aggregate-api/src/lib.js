import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import * as Types from './types.js'
import * as CAR from '@ucanto/transport/car'
import { createService as createAggregateService } from './aggregate.js'
import { createService as createOfferService } from './offer.js'
export * from './types.js'

/**
 * @param {Types.UcantoServerContext} options
 */
export const createServer = ({ id, codec = CAR.inbound, ...context }) =>
  Server.create({
    id,
    codec: CAR.inbound,
    service: createService(context),
    catch: (error) => context.errorReporter.catch(error),
  })

/**
 * @param {Types.ServiceContext} context
 * @returns {Types.Service}
 */
export const createService = (context) => ({
  aggregate: createAggregateService(context),
  offer: createOfferService(context),
})

/**
 * @param {object} options
 * @param {Types.UcantoInterface.Principal} options.id
 * @param {Types.UcantoInterface.Transport.Channel<Types.Service>} options.channel
 * @param {Types.UcantoInterface.OutboundCodec} [options.codec]
 */
export const connect = ({ id, channel, codec = CAR.outbound }) =>
  Client.connect({
    id,
    channel,
    codec,
  })

export {
  createService as createUploadService,
  createServer as createUploadServer,
  connect as createUploadClient,
}

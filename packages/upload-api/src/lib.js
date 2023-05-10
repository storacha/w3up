import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import * as Types from './types.js'
import * as Legacy from '@ucanto/transport/legacy'
import * as CAR from '@ucanto/transport/car'
import { createService as createStoreService } from './store.js'
import { createService as createUploadService } from './upload.js'
import { createService as createConsoleService } from './console.js'
export * from './types.js'

/**
 * @param {Types.UcantoServerContext} options
 */
export const createServer = ({ id, codec = Legacy.inbound, ...context }) =>
  Server.create({
    id,
    codec,
    service: createService(context),
    catch: (error) => context.errorReporter.catch(error),
  })

/**
 * @param {Types.ServiceContext} context
 * @returns {Types.Service}
 */
export const createService = (context) => ({
  store: createStoreService(context),
  upload: createUploadService(context),
  console: createConsoleService(context)
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
  createService as createUploadService,
  createServer as createUploadServer,
  connect as createUploadClient,
}

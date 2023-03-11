import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import * as Types from './types.js'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import { createService as createStoreService } from './store.js'
import { createService as createUploadService } from './upload.js'
export * from './types.js'

/**
 * @param {Types.UcantoServerContext} options
 */
export const createServer = ({
  id,
  decoder = CAR,
  encoder = CBOR,
  ...context
}) =>
  Server.create({
    id,
    encoder,
    decoder,
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
})

/**
 * @param {object} options
 * @param {Types.Principal} options.id
 * @param {Types.Transport.Channel<Types.Service>} options.channel
 * @param {Types.Transport.RequestEncoder} [options.encoder]
 * @param {Types.Transport.ResponseDecoder} [options.decoder]
 */
export const connect = ({ id, channel, encoder = CAR, decoder = CBOR }) =>
  Client.connect({
    id,
    channel,
    encoder,
    decoder,
  })

export {
  createService as createUploadService,
  createServer as createUploadServer,
  connect as createUploadClient,
}

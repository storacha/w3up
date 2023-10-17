import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import { Filecoin as FilecoinCapabilities } from '@web3-storage/capabilities'

import * as API from './types.js'
import { QueueOperationFailed, StoreOperationFailed } from './errors.js'

/**
 * @param {API.Input<FilecoinCapabilities.filecoinAdd>} input
 * @param {API.StorefrontServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.FilecoinAddSuccess, API.FilecoinAddFailure> | API.UcantoInterface.JoinBuilder<API.FilecoinAddSuccess>>}
 */
export const add = async ({ capability }, context) => {
  const { piece, content } = capability.nb

  /// Store piece into the store. Store events MAY be used to propagate piece over
  const put = await context.pieceStore.put({
    content,
    piece,
    insertedAt: Date.now(),
  })
  if (put.error) {
    return {
      error: new StoreOperationFailed(put.error.message),
    }
  }

  return {
    ok: {
      piece,
    },
  }
}

/**
 * @param {API.Input<FilecoinCapabilities.filecoinQueue>} input
 * @param {API.StorefrontServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.FilecoinAddSuccess, API.FilecoinAddFailure> | API.UcantoInterface.JoinBuilder<API.FilecoinAddSuccess>>}
 */
export const queue = async ({ capability }, context) => {
  const { piece, content } = capability.nb

  const queued = await context.addQueue.add({
    piece,
    content,
    insertedAt: Date.now(),
  })
  if (queued.error) {
    return {
      error: new QueueOperationFailed(queued.error.message),
    }
  }

  // Create effect for receipt
  const fx = await FilecoinCapabilities.filecoinAdd
    .invoke({
      issuer: context.id,
      audience: context.id,
      with: context.id.did(),
      nb: {
        piece,
        content,
      },
    })
    .delegate()

  return Server.ok({
    piece,
  }).join(fx.link())
}

/**
 * @param {API.StorefrontServiceContext} context
 */
export function createService(context) {
  return {
    filecoin: {
      queue: Server.provideAdvanced({
        capability: FilecoinCapabilities.filecoinQueue,
        handler: (input) => queue(input, context),
      }),
      add: Server.provideAdvanced({
        capability: FilecoinCapabilities.filecoinAdd,
        handler: (input) => add(input, context),
      }),
    },
  }
}

/**
 * @param {API.UcantoServerContext & API.StorefrontServiceContext} context
 */
export const createServer = (context) =>
  Server.create({
    id: context.id,
    codec: context.codec || CAR.inbound,
    service: createService(context),
    catch: (error) => context.errorReporter.catch(error),
    validateAuthorization: (auth) => context.validateAuthorization(auth),
  })

/**
 * @param {object} options
 * @param {API.UcantoInterface.Principal} options.id
 * @param {API.UcantoInterface.Transport.Channel<API.StorefrontService>} options.channel
 * @param {API.UcantoInterface.OutboundCodec} [options.codec]
 */
export const connect = ({ id, channel, codec = CAR.outbound }) =>
  Client.connect({
    id,
    channel,
    codec,
  })

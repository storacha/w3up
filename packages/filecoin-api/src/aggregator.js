import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import { Filecoin as FilecoinCapabilities } from '@web3-storage/capabilities'

import * as API from './types.js'
import { QueueOperationFailed, StoreOperationFailed } from './errors.js'

/**
 * @param {API.Input<FilecoinCapabilities.aggregateAdd>} input
 * @param {API.AggregatorServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.AggregateAddSuccess, API.AggregateAddFailure> | API.UcantoInterface.JoinBuilder<API.AggregateAddSuccess>>}
 */
export const add = async ({ capability }, context) => {
  const { piece, storefront, group } = capability.nb

  // Store piece into the store. Store events MAY be used to propagate piece over
  const put = await context.pieceStore.put({
    piece,
    storefront,
    group,
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
 * @param {API.Input<FilecoinCapabilities.aggregateQueue>} input
 * @param {API.AggregatorServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.AggregateAddSuccess, API.AggregateAddFailure> | API.UcantoInterface.JoinBuilder<API.AggregateAddSuccess>>}
 */
export const queue = async ({ capability }, context) => {
  const { piece, group } = capability.nb
  const storefront = capability.with

  const queued = await context.addQueue.add({
    piece,
    storefront,
    group,
    insertedAt: Date.now(),
  })
  if (queued.error) {
    return {
      error: new QueueOperationFailed(queued.error.message),
    }
  }

  // Create effect for receipt
  const fx = await FilecoinCapabilities.aggregateAdd
    .invoke({
      issuer: context.id,
      audience: context.id,
      with: context.id.did(),
      nb: {
        piece,
        storefront,
        group,
      },
    })
    .delegate()

  return Server.ok({
    piece,
  }).join(fx.link())
}

/**
 * @param {API.AggregatorServiceContext} context
 */
export function createService(context) {
  return {
    aggregate: {
      queue: Server.provideAdvanced({
        capability: FilecoinCapabilities.aggregateQueue,
        handler: (input) => queue(input, context),
      }),
      add: Server.provideAdvanced({
        capability: FilecoinCapabilities.aggregateAdd,
        handler: (input) => add(input, context),
      }),
    },
  }
}

/**
 * @param {API.UcantoServerContext & API.AggregatorServiceContext} context
 */
export const createServer = (context) =>
  Server.create({
    id: context.id,
    codec: context.codec || CAR.inbound,
    service: createService(context),
    catch: (error) => context.errorReporter.catch(error),
    validateAuthorization: () => ({ ok: {} }),
  })

/**
 * @param {object} options
 * @param {API.UcantoInterface.Principal} options.id
 * @param {API.UcantoInterface.Transport.Channel<API.AggregatorService>} options.channel
 * @param {API.UcantoInterface.OutboundCodec} [options.codec]
 */
export const connect = ({ id, channel, codec = CAR.outbound }) =>
  Client.connect({
    id,
    channel,
    codec,
  })

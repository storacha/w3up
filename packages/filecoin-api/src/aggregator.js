import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import { Filecoin as FilecoinCapabilities } from '@web3-storage/capabilities'

import * as API from './types.js'
import { QueueOperationFailed, StoreOperationFailed } from './errors.js'

/**
 * @param {API.Input<FilecoinCapabilities.pieceAdd>} input
 * @param {API.AggregatorServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.PieceAddSuccess, API.PieceAddFailure> | API.UcantoInterface.JoinBuilder<API.PieceAddSuccess>>}
 */
export const claim = async ({ capability }, context) => {
  const { piece, space, group } = capability.nb
  // Check if self signed to call queue handler
  if (context.id.did() === capability.with) {
    return queueHandler(piece, space, group, context)
  }

  return queueAdd(piece, space, group, context)
}

/**
 * @param {import('@web3-storage/data-segment').PieceLink} piece
 * @param {string} space
 * @param {string} group
 * @param {API.AggregatorServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.PieceAddSuccess, API.PieceAddFailure> | API.UcantoInterface.JoinBuilder<API.PieceAddSuccess>>}
 */
async function queueAdd(piece, space, group, context) {
  const queued = await context.addQueue.add(
    {
      piece,
      space,
      group
    }
  )
  if (queued.error) {
    return {
      error: new QueueOperationFailed(queued.error.message, piece),
    }
  }

  // Create effect for receipt
  const fx = await FilecoinCapabilities.pieceAdd
    .invoke({
      issuer: context.id,
      audience: context.id,
      with: context.id.did(),
      nb: {
        piece,
        space,
        group,
      },
    })
    .delegate()

  return Server.ok({
    status: /** @type {API.QUEUE_STATUS} */ ('queued'),
    piece,
  }).join(fx.link())
}

/**
 * @param {import('@web3-storage/data-segment').PieceLink} piece
 * @param {string} space
 * @param {string} group
 * @param {API.AggregatorServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.PieceAddSuccess, API.PieceAddFailure> | API.UcantoInterface.JoinBuilder<API.PieceAddSuccess>>}
 */
async function queueHandler(piece, space, group, context) {
  const put = await context.pieceStore.put({
    piece,
    space,
    group
  })

  if (put.error) {
    return {
      error: new StoreOperationFailed(put.error.message, piece),
    }
  }

  // TODO: send to broker?

  return {
    ok: {
      status: 'accepted',
      piece,
    },
  }
}

/**
 * @param {API.AggregatorServiceContext} context
 */
export function createService(context) {
  return {
    piece: {
      add: Server.provideAdvanced({
        capability: FilecoinCapabilities.pieceAdd,
        handler: (input) => claim(input, context),
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

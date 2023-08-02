import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import { CBOR } from '@ucanto/core'
import { Filecoin as FilecoinCapabilities } from '@web3-storage/capabilities'

import * as API from './types.js'
import {
  QueueOperationFailed,
  StoreOperationFailed,
  DecodeBlockOperationFailed,
} from './errors.js'

/**
 * @param {API.Input<FilecoinCapabilities.aggregateAdd>} input
 * @param {API.BrokerServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.AggregateAddSuccess, API.AggregateAddFailure> | API.UcantoInterface.JoinBuilder<API.AggregateAddSuccess>>}
 */
export const claim = async ({ capability, invocation }, context) => {
  const { piece, offer: offerCid, deal } = capability.nb
  const offer = getOfferBlock(offerCid, invocation.iterateIPLDBlocks())

  if (!offer) {
    return {
      error: new DecodeBlockOperationFailed(
        `missing offer block in invocation: ${offerCid.toString()}`,
        piece
      ),
    }
  }

  // Check if self signed to call queue handler
  if (context.id.did() === capability.with) {
    return queueHandler(piece, offer, deal, context)
  }

  return queueAdd(piece, offerCid, deal, offer, context)
}

/**
 * @param {import('@web3-storage/data-segment').PieceLink} piece
 * @param {Server.API.Link<unknown, number, number, 0 | 1>} offerCid
 * @param {import('@web3-storage/data-segment').PieceLink[]} offer
 * @param {import('@web3-storage/filecoin-client/types').DealConfig} deal
 * @param {API.BrokerServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.AggregateAddSuccess, API.AggregateAddFailure> | API.UcantoInterface.JoinBuilder<API.AggregateAddSuccess>>}
 */
async function queueAdd(piece, offerCid, deal, offer, context) {
  const queued = await context.addQueue.add({
    piece,
    offer, // TODO: not store in queue but proper data structure
    deal,
  })
  if (queued.error) {
    return {
      error: new QueueOperationFailed(queued.error.message, piece),
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
        offer: offerCid,
        deal,
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
 * @param {import('@web3-storage/data-segment').PieceLink[]} offer
 * @param {import('@web3-storage/filecoin-client/types').DealConfig} deal
 * @param {API.BrokerServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.AggregateAddSuccess, API.AggregateAddFailure> | API.UcantoInterface.JoinBuilder<API.AggregateAddSuccess>>}
 */
async function queueHandler(piece, offer, deal, context) {
  const put = await context.offerStore.put({
    offer,
    piece,
    deal,
  })
  if (put.error) {
    return {
      error: new StoreOperationFailed(put.error.message, piece),
    }
  }

  // TODO: how to failure?

  return {
    ok: {
      status: 'accepted',
      piece,
    },
  }
}

/**
 * @param {Server.API.Link<unknown, number, number, 0 | 1>} offerCid
 * @param {IterableIterator<Server.API.Transport.Block<unknown, number, number, 1>>} blockIterator
 */
function getOfferBlock(offerCid, blockIterator) {
  for (const block of blockIterator) {
    if (block.cid.equals(offerCid)) {
      const decoded =
        /** @type {import('@web3-storage/data-segment').PieceLink[]} */ (
          CBOR.decode(block.bytes)
        )
      return decoded
      // TODO: Validate with schema
    }
  }
}

/**
 * @param {API.BrokerServiceContext} context
 */
export function createService(context) {
  return {
    aggregate: {
      add: Server.provideAdvanced({
        capability: FilecoinCapabilities.aggregateAdd,
        handler: (input) => claim(input, context),
      }),
    },
  }
}

/**
 * @param {API.UcantoServerContext & API.BrokerServiceContext} context
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
 * @param {API.UcantoInterface.Transport.Channel<API.BrokerService>} options.channel
 * @param {API.UcantoInterface.OutboundCodec} [options.codec]
 */
export const connect = ({ id, channel, codec = CAR.outbound }) =>
  Client.connect({
    id,
    channel,
    codec,
  })

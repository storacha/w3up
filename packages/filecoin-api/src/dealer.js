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
 * @param {API.Input<FilecoinCapabilities.dealQueue>} input
 * @param {API.DealerServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.DealAddSuccess, API.DealAddFailure> | API.UcantoInterface.JoinBuilder<API.DealAddSuccess>>}
 */
export const queue = async ({ capability, invocation }, context) => {
  const { aggregate, pieces: offerCid, storefront, label } = capability.nb
  const pieces = getOfferBlock(offerCid, invocation.iterateIPLDBlocks())

  if (!pieces) {
    return {
      error: new DecodeBlockOperationFailed(
        `missing offer block in invocation: ${offerCid.toString()}`
      ),
    }
  }

  const queued = await context.addQueue.add({
    aggregate,
    pieces, // add queue can opt to store offers in separate datastore
    storefront,
    label,
    insertedAt: Date.now(),
  })
  if (queued.error) {
    return {
      error: new QueueOperationFailed(queued.error.message),
    }
  }

  // Create effect for receipt
  const fx = await FilecoinCapabilities.dealAdd
    .invoke({
      issuer: context.id,
      audience: context.id,
      with: context.id.did(),
      nb: {
        aggregate,
        pieces: offerCid,
        storefront,
        label,
      },
    })
    .delegate()

  return Server.ok({
    aggregate,
  }).join(fx.link())
}

/**
 * @param {API.Input<FilecoinCapabilities.dealAdd>} input
 * @param {API.DealerServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.DealAddSuccess, API.DealAddFailure> | API.UcantoInterface.JoinBuilder<API.DealAddSuccess>>}
 */
export const add = async ({ capability, invocation }, context) => {
  const { aggregate, pieces: offerCid, storefront } = capability.nb
  const pieces = getOfferBlock(offerCid, invocation.iterateIPLDBlocks())

  if (!pieces) {
    return {
      error: new DecodeBlockOperationFailed(
        `missing offer block in invocation: ${offerCid.toString()}`
      ),
    }
  }

  // Get deal status from the store.
  const get = await context.dealStore.get({
    aggregate,
    storefront,
  })
  if (get.error) {
    return {
      error: new StoreOperationFailed(get.error.message),
    }
  }

  return {
    ok: {
      aggregate,
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
 * @param {API.DealerServiceContext} context
 */
export function createService(context) {
  return {
    deal: {
      queue: Server.provideAdvanced({
        capability: FilecoinCapabilities.dealQueue,
        handler: (input) => queue(input, context),
      }),
      add: Server.provideAdvanced({
        capability: FilecoinCapabilities.dealAdd,
        handler: (input) => add(input, context),
      }),
    },
  }
}

/**
 * @param {API.UcantoServerContext & API.DealerServiceContext} context
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
 * @param {API.UcantoInterface.Transport.Channel<API.DealerService>} options.channel
 * @param {API.UcantoInterface.OutboundCodec} [options.codec]
 */
export const connect = ({ id, channel, codec = CAR.outbound }) =>
  Client.connect({
    id,
    channel,
    codec,
  })

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
 * @param {API.Input<FilecoinCapabilities.dealAdd>} input
 * @param {API.DealerServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.DealAddSuccess, API.DealAddFailure> | API.UcantoInterface.JoinBuilder<API.DealAddSuccess>>}
 */
export const add = async ({ capability, invocation }, context) => {
  const { aggregate, pieces: offerCid, storefront, label } = capability.nb
  const pieces = getOfferBlock(offerCid, invocation.iterateIPLDBlocks())

  if (!pieces) {
    return {
      error: new DecodeBlockOperationFailed(
        `missing offer block in invocation: ${offerCid.toString()}`
      ),
    }
  }

  // If self issued we accept without verification
  return context.id.did() === capability.with
    ? accept(aggregate, pieces, storefront, label, context)
    : enqueue(aggregate, offerCid, storefront, label, pieces, context)
}

/**
 * @param {import('@web3-storage/data-segment').LegacyPieceLink} aggregate
 * @param {Server.API.Link<unknown, number, number, 0 | 1>} offerCid
 * @param {string} storefront
 * @param {string | undefined} label
 * @param {import('@web3-storage/data-segment').PieceLink[]} pieces
 * @param {API.DealerServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.DealAddSuccess, API.DealAddFailure> | API.UcantoInterface.JoinBuilder<API.DealAddSuccess>>}
 */
async function enqueue(
  aggregate,
  offerCid,
  storefront,
  label,
  pieces,
  context
) {
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
 * @param {import('@web3-storage/data-segment').LegacyPieceLink} aggregate
 * @param {import('@web3-storage/data-segment').PieceLink[]} pieces
 * @param {string} storefront
 * @param {string | undefined} label
 * @param {API.DealerServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.DealAddSuccess, API.DealAddFailure> | API.UcantoInterface.JoinBuilder<API.DealAddSuccess>>}
 */
async function accept(aggregate, pieces, storefront, label, context) {
  // TODO: failure - needs to read from store

  // Store aggregate into the store. Store events MAY be used to propagate aggregate over
  const put = await context.offerStore.put({
    aggregate,
    pieces,
    storefront,
    label,
    insertedAt: Date.now(),
  })
  if (put.error) {
    return {
      error: new StoreOperationFailed(put.error.message),
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

import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import * as AggregatorCaps from '@web3-storage/capabilities/filecoin/aggregator'
import * as DealerCaps from '@web3-storage/capabilities/filecoin/dealer'
// eslint-disable-next-line no-unused-vars
import * as API from '../types.js'
import {
  QueueOperationFailed,
  StoreOperationFailed,
  UnexpectedState,
  UnsupportedCapability,
} from '../errors.js'

/**
 * @param {API.Input<AggregatorCaps.pieceOffer>} input
 * @param {import('./api.js').ServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.PieceOfferSuccess, API.PieceOfferFailure> | API.UcantoInterface.JoinBuilder<API.PieceOfferSuccess>>}
 */
export const pieceOffer = async ({ capability }, context) => {
  // Only service principal can perform offer
  if (capability.with !== context.id.did()) {
    return {
      error: new UnsupportedCapability({ capability }),
    }
  }
  const { piece, group } = capability.nb

  // dedupe
  const hasRes = await context.pieceStore.has({ piece, group })
  if (hasRes.error) {
    return {
      error: new StoreOperationFailed(hasRes.error.message),
    }
  }

  if (!hasRes.ok) {
    const addRes = await context.pieceQueue.add({ piece, group })
    if (addRes.error) {
      return {
        error: new QueueOperationFailed(addRes.error.message),
      }
    }
  }

  const fx = await AggregatorCaps.pieceAccept
    .invoke({
      issuer: context.id,
      audience: context.id,
      with: context.id.did(),
      nb: {
        piece,
        group,
      },
      expiration: Infinity,
    })
    .delegate()

  /** @type {API.UcantoInterface.OkBuilder<API.PieceOfferSuccess, API.PieceOfferFailure>} */
  const result = Server.ok({ piece })
  return result.join(fx.link())
}

/**
 * @param {API.Input<AggregatorCaps.pieceAccept>} input
 * @param {import('./api.js').ServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.PieceAcceptSuccess, API.PieceAcceptFailure> | API.UcantoInterface.JoinBuilder<API.PieceAcceptSuccess>>}
 */
export const pieceAccept = async ({ capability }, context) => {
  // Only service principal can perform accept
  if (capability.with !== context.id.did()) {
    return {
      error: new UnsupportedCapability({ capability }),
    }
  }
  const { piece, group } = capability.nb

  // Get inclusion proof for piece associated with this group
  const getInclusionRes = await context.inclusionStore.query({ piece, group })
  if (getInclusionRes.error) {
    return {
      error: new StoreOperationFailed(getInclusionRes.error?.message),
    }
  }
  if (!getInclusionRes.ok.length) {
    return {
      error: new UnexpectedState(
        `no inclusion proof found for pair {${piece}, ${group}}`
      ),
    }
  }

  // Get buffered pieces
  const [{ aggregate, inclusion }] = getInclusionRes.ok
  const getAggregateRes = await context.aggregateStore.get({ aggregate })
  if (getAggregateRes.error) {
    return {
      error: new StoreOperationFailed(getAggregateRes.error.message),
    }
  }
  const { pieces } = getAggregateRes.ok

  // Create effect for receipt
  const fx = await DealerCaps.aggregateOffer
    .invoke({
      issuer: context.id,
      audience: context.dealerId,
      with: context.id.did(),
      nb: {
        aggregate,
        pieces,
      },
      expiration: Infinity,
    })
    .delegate()

  /** @type {API.UcantoInterface.OkBuilder<API.PieceAcceptSuccess, API.PieceAcceptFailure>} */
  const result = Server.ok({ piece, aggregate, inclusion })
  return result.join(fx.link())
}

/**
 * @param {import('./api.js').ServiceContext} context
 */
export function createService(context) {
  return {
    piece: {
      offer: Server.provideAdvanced({
        capability: AggregatorCaps.pieceOffer,
        handler: (input) => pieceOffer(input, context),
      }),
      accept: Server.provideAdvanced({
        capability: AggregatorCaps.pieceAccept,
        handler: (input) => pieceAccept(input, context),
      }),
    },
  }
}

/**
 * @param {API.UcantoServerContext & import('./api.js').ServiceContext} context
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
 * @param {API.UcantoInterface.Transport.Channel<API.AggregatorService>} options.channel
 * @param {API.UcantoInterface.OutboundCodec} [options.codec]
 */
export const connect = ({ id, channel, codec = CAR.outbound }) =>
  Client.connect({
    id,
    channel,
    codec,
  })

import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import { CBOR } from '@ucanto/core'
import { sha256 } from 'multiformats/hashes/sha2'
import * as Block from 'multiformats/block'
import * as DealerCaps from '@web3-storage/capabilities/filecoin/dealer'
// eslint-disable-next-line no-unused-vars
import * as API from '../types.js'
import { StoreOperationFailed, DecodeBlockOperationFailed } from '../errors.js'

/**
 * @param {API.Input<DealerCaps.aggregateOffer>} input
 * @param {import('./api').ServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.AggregateOfferSuccess, API.AggregateOfferFailure> | API.UcantoInterface.JoinBuilder<API.AggregateOfferSuccess>>}
 */
export const aggregateOffer = async ({ capability, invocation }, context) => {
  const issuer = invocation.issuer.did()
  const { aggregate, pieces } = capability.nb

  const hasRes = await context.aggregateStore.has({ aggregate })
  if (hasRes.error) {
    return {
      error: new StoreOperationFailed(hasRes.error.message),
    }
  }
  const exists = hasRes.ok

  if (!exists) {
    const piecesBlockRes = await findCBORBlock(
      pieces,
      invocation.iterateIPLDBlocks()
    )
    if (piecesBlockRes.error) {
      return piecesBlockRes
    }

    // Write Spade formatted doc to offerStore before putting aggregate for tracking
    const putOfferRes = await context.offerStore.put({
      key: piecesBlockRes.ok.cid.toString(),
      value: {
        issuer,
        aggregate,
        pieces: piecesBlockRes.ok.value,
      },
    })
    if (putOfferRes.error) {
      return {
        error: new StoreOperationFailed(putOfferRes.error.message),
      }
    }

    // Put aggregate offered into store
    const putRes = await context.aggregateStore.put({
      aggregate,
      pieces,
      status: 'offered',
      insertedAt: Date.now(),
      updatedAt: Date.now(),
    })
    if (putRes.error) {
      return {
        error: new StoreOperationFailed(putRes.error.message),
      }
    }
  }

  // Effect
  const fx = await DealerCaps.aggregateAccept
    .invoke({
      issuer: context.id,
      audience: context.id,
      with: context.id.did(),
      nb: {
        aggregate,
        pieces,
      },
      expiration: Infinity,
    })
    .delegate()

  /** @type {API.UcantoInterface.OkBuilder<API.AggregateOfferSuccess, API.AggregateOfferFailure>} */
  const result = Server.ok({ aggregate })
  return result.join(fx.link())
}

/**
 * @param {API.Input<DealerCaps.aggregateAccept>} input
 * @param {import('./api').ServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.AggregateAcceptSuccess, API.AggregateAcceptFailure>>}
 */
export const aggregateAccept = async ({ capability }, context) => {
  const { aggregate } = capability.nb

  // Get deal status from the store.
  const get = await context.aggregateStore.get({
    aggregate,
  })
  if (get.error) {
    return {
      error: new StoreOperationFailed(get.error.message),
    }
  }
  if (!get.ok.deal) {
    return {
      error: new StoreOperationFailed('no deal available'),
    }
  }

  return {
    ok: {
      aggregate,
      dataSource: get.ok.deal.dataSource,
      dataType: get.ok.deal.dataType,
    },
  }
}

/**
 * @param {import('multiformats').Link} cid
 * @param {IterableIterator<Server.API.Transport.Block<unknown, number, number, 1>>} blocks
 * @returns {Promise<API.UcantoInterface.Result<import('multiformats').BlockView, DecodeBlockOperationFailed>>}
 */
const findCBORBlock = async (cid, blocks) => {
  let bytes
  for (const b of blocks) {
    if (b.cid.equals(cid)) {
      bytes = b.bytes
    }
  }
  if (!bytes) {
    return {
      error: new DecodeBlockOperationFailed(`missing block: ${cid}`),
    }
  }
  return {
    ok: await Block.create({ cid, bytes, codec: CBOR, hasher: sha256 }),
  }
}

/**
 * @param {import('./api').ServiceContext} context
 */
export function createService(context) {
  return {
    aggregate: {
      offer: Server.provideAdvanced({
        capability: DealerCaps.aggregateOffer,
        handler: (input) => aggregateOffer(input, context),
      }),
      accept: Server.provideAdvanced({
        capability: DealerCaps.aggregateAccept,
        handler: (input) => aggregateAccept(input, context),
      }),
    },
  }
}

/**
 * @param {API.UcantoServerContext & import('./api').ServiceContext} context
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

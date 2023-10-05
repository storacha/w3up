import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import * as StorefrontCaps from '@web3-storage/capabilities/filecoin/storefront'
import * as AggregatorCaps from '@web3-storage/capabilities/filecoin/aggregator'
// eslint-disable-next-line no-unused-vars
import * as API from '../types.js'
import { QueueOperationFailed, StoreOperationFailed } from '../errors.js'

/**
 * @param {API.Input<StorefrontCaps.filecoinOffer>} input
 * @param {import('./api').ServiceContext} context
 */
export const filecoinOffer = async ({ capability }, context) => {
  const { piece, content } = capability.nb

  const hasRes = await context.pieceStore.has(piece)
  if (hasRes.error) {
    return { error: new StoreOperationFailed(hasRes.error.message) }
  }
  const exists = hasRes.ok
  const group = context.id.did()
  
  if (!exists) {
    const putRes = await context.pieceStore.put({
      piece,
      content,
      group,
      status: 'offered',
      insertedAt: Date.now(),
      updatedAt: Date.now()
    })
    if (putRes.error) {
      return { error: new StoreOperationFailed(putRes.error.message) }
    }

    // Queue the piece for validation etc.
    const queueRes = await context.filecoinSubmitQueue.add({
      piece,
      content,
      group,
    })
    if (queueRes.error) {
      return {
        error: new QueueOperationFailed(queueRes.error.message),
      }
    }
  }

  // Create effect for receipt
  const [submitfx, acceptfx] = await Promise.all([
    StorefrontCaps.filecoinSubmit
      .invoke({
        issuer: context.id,
        audience: context.id,
        with: context.id.did(),
        nb: {
          piece,
          content,
        },
        expiration: Infinity,
      })
      .delegate(),
    StorefrontCaps.filecoinAccept
      .invoke({
        issuer: context.id,
        audience: context.id,
        with: context.id.did(),
        nb: {
          piece,
          content,
        },
        expiration: Infinity,
      })
      .delegate()
  ])

  /** @type {API.UcantoInterface.OkBuilder<API.FilecoinOfferSuccess, API.FilecoinOfferFailure>} */
  const result = Server.ok({ piece })
  return result.fork(submitfx.link()).join(acceptfx.link())
}

/**
 * @param {API.Input<StorefrontCaps.filecoinSubmit>} input
 * @param {import('./api').ServiceContext} context
 */
export const filecoinSubmit = async ({ capability }, context) => {
  const { piece, content } = capability.nb
  const group = context.id.did()

  const res = await context.pieceOfferQueue.add({
    piece,
    content,
    group,
  })
  if (res.error) {
    return {
      error: new QueueOperationFailed(res.error.message),
    }
  }

  // Create effect for receipt
  const fx = await AggregatorCaps.pieceOffer
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

  /** @type {API.UcantoInterface.OkBuilder<API.FilecoinSubmitSuccess, API.FilecoinSubmitFailure>} */
  const result = Server.ok({ piece })
  return result.join(fx.link())
}

/**
 * @param {API.Input<StorefrontCaps.filecoinAccept>} input
 * @param {import('./api').ServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.FilecoinAcceptSuccess, API.FilecoinAcceptFailure>>}
 */
export const filecoinAccept = async ({ capability }, context) => {
  const { piece } = capability.nb
  const getPieceRes = await context.pieceStore.get(piece)
  if (getPieceRes.error) {
    return { error: new StoreOperationFailed(getPieceRes.error.message) }
  }

  const { group } = getPieceRes.ok
  const fx = await AggregatorCaps.pieceOffer
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

  return await findDataAggregationProof(context, fx.link())
}

/**
 * Find a DataAggregationProof by following the receipt chain for a piece
 * offered to the Filecoin pipeline.
 *
 * @param {{
 *   taskStore: API.Store<API.UcantoInterface.Invocation>
 *   receiptStore: API.Store<API.UcantoInterface.Receipt>
 * }} stores
 * @param {API.UcantoInterface.Link} task
 * @returns {Promise<API.UcantoInterface.Result<API.DataAggregationProof, API.StoreOperationError|ProofNotFound>>}
 */
async function findDataAggregationProof ({ taskStore, receiptStore }, task) {
  /** @type {API.InclusionProof|undefined} */
  let inclusion
  /** @type {API.DataAggregationProof|undefined} */
  let dataAggregation
  while (true) {
    const [taskRes, receiptRes] = await Promise.all([
      taskStore.get(task),
      receiptStore.get(task)
    ])
    if (taskRes.error) {
      return {
        error: new StoreOperationFailed(`failed to fetch task: ${task}: ${taskRes.error.message}`)
      }
    }
    if (receiptRes.error) {
      return {
        error: new StoreOperationFailed(`failed to fetch receipt for task: ${task}: ${receiptRes.error.message}`)
      }
    }
    const ability = taskRes.ok.capabilities[0]?.can
    if (ability === 'piece/accept' && receiptRes.ok.out.ok) {
      inclusion = receiptRes.ok.out.ok.inclusion
    } else if (ability === 'aggregate/accept' && receiptRes.ok.out.ok) {
      dataAggregation = receiptRes.ok.out.ok
    }
    if (!receiptRes.ok.fx.join) break
    task = receiptRes.ok.fx.join
  }
  if (!inclusion) {
    return { error: new ProofNotFound('missing inclusion proof for piece in aggregate') }
  }
  if (!dataAggregation) {
    return { error: new ProofNotFound('missing data aggregation proof') }
  }
  return { ok: { ...dataAggregation, inclusion } }
}

export const ProofNotFoundName = /** @type {const} */ ('ProofNotFound')
export class ProofNotFound extends Server.Failure {
  get reason() {
    return this.message
  }

  get name() {
    return ProofNotFoundName
  }
}

/**
 * @param {import('./api').ServiceContext} context
 */
export function createService(context) {
  return {
    filecoin: {
      offer: Server.provideAdvanced({
        capability: StorefrontCaps.filecoinOffer,
        handler: (input) => filecoinOffer(input, context),
      }),
      submit: Server.provideAdvanced({
        capability: StorefrontCaps.filecoinSubmit,
        handler: (input) => filecoinSubmit(input, context),
      }),
      accept: Server.provideAdvanced({
        capability: StorefrontCaps.filecoinAccept,
        handler: (input) => filecoinAccept(input, context),
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
 * @param {API.UcantoInterface.Transport.Channel<API.StorefrontService>} options.channel
 * @param {API.UcantoInterface.OutboundCodec} [options.codec]
 */
export const connect = ({ id, channel, codec = CAR.outbound }) =>
  Client.connect({
    id,
    channel,
    codec,
  })

import pMap from 'p-map'
import { Storefront, Aggregator } from '@web3-storage/filecoin-client'
import * as AggregatorCaps from '@web3-storage/capabilities/filecoin/aggregator'
import { Assert } from '@web3-storage/content-claims/capability'

import { computePieceCid } from './piece.js'
// eslint-disable-next-line no-unused-vars
import * as API from '../types.js'
import {
  RecordNotFoundErrorName,
  BlobNotFound,
  StoreOperationFailed,
  UnexpectedPiece,
  UnexpectedState,
} from '../errors.js'

/**
 * @typedef {import('./api.js').PieceRecord} PieceRecord
 * @typedef {import('./api.js').PieceRecordKey} PieceRecordKey
 * @typedef {import('../types.js').UpdatableAndQueryableStore<PieceRecordKey, PieceRecord, Pick<PieceRecord, 'status'>>} PieceStore
 */

/**
 * On filecoin submit queue messages, validate piece for given content and store it in store.
 *
 * @param {import('./api.js').FilecoinSubmitMessageContext} context
 * @param {import('./api.js').FilecoinSubmitMessage} message
 */
export const handleFilecoinSubmitMessage = async (context, message) => {
  // dedupe concurrent writes
  const hasRes = await context.pieceStore.has({ piece: message.piece })
  if (hasRes.error) {
    return { error: new StoreOperationFailed(hasRes.error.message) }
  }
  if (hasRes.ok) {
    return {
      ok: {},
    }
  }

  // read and compute piece for content
  // TODO: needs to be hooked with location claims
  const contentStreamRes = await context.contentStore.stream(message.content)
  if (contentStreamRes.error) {
    return { error: new BlobNotFound(contentStreamRes.error.message) }
  }

  const computedPieceCid = await computePieceCid(contentStreamRes.ok)
  if (computedPieceCid.error) {
    return computedPieceCid
  }

  // check provided piece equals the one computed
  if (!message.piece.equals(computedPieceCid.ok.piece.link)) {
    return {
      error: new UnexpectedPiece(
        `provided piece ${message.piece.toString()} is not the same as computed ${
          computedPieceCid.ok.piece
        }`
      ),
    }
  }

  const putRes = await context.pieceStore.put({
    piece: message.piece,
    content: message.content,
    group: message.group,
    status: 'submitted',
    insertedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  if (putRes.error) {
    return { error: new StoreOperationFailed(putRes.error.message) }
  }
  return { ok: {} }
}

/**
 * On piece offer queue message, offer piece for aggregation.
 *
 * @param {import('./api.js').PieceOfferMessageContext} context
 * @param {import('./api.js').PieceOfferMessage} message
 */
export const handlePieceOfferMessage = async (context, message) => {
  const pieceOfferInv = await Aggregator.pieceOffer(
    context.aggregatorService.invocationConfig,
    message.piece,
    message.group,
    { connection: context.aggregatorService.connection }
  )
  if (pieceOfferInv.out.error) {
    return {
      error: pieceOfferInv.out.error,
    }
  }

  return { ok: {} }
}

/**
 * On piece inserted into store, invoke submit to queue piece to be offered for aggregate.
 *
 * @param {import('./api.js').StorefrontClientContext} context
 * @param {PieceRecord} record
 */
export const handlePieceInsert = async (context, record) => {
  const filecoinSubmitInv = await Storefront.filecoinSubmit(
    context.storefrontService.invocationConfig,
    record.content,
    record.piece,
    { connection: context.storefrontService.connection }
  )

  if (filecoinSubmitInv.out.error) {
    return {
      error: filecoinSubmitInv.out.error,
    }
  }

  return { ok: {} }
}

/**
 * On piece inserted into store, invoke equivalency claim to enable reads.
 *
 * @param {import('./api.js').ClaimsClientContext} context
 * @param {PieceRecord} record
 */
export const handlePieceInsertToEquivalencyClaim = async (context, record) => {
  const claimResult = await Assert.equals
    .invoke({
      issuer: context.claimsService.invocationConfig.issuer,
      audience: context.claimsService.invocationConfig.audience,
      with: context.claimsService.invocationConfig.with,
      nb: {
        content: record.content,
        equals: record.piece,
      },
      expiration: Infinity,
      proofs: context.claimsService.invocationConfig.proofs,
    })
    .execute(context.claimsService.connection)
  if (claimResult.out.error) {
    return {
      error: claimResult.out.error,
    }
  }

  return {
    ok: {},
  }
}

/**
 * @param {import('./api.js').StorefrontClientContext} context
 * @param {PieceRecord} record
 */
export const handlePieceStatusUpdate = async (context, record) => {
  // Validate expected status
  if (record.status === 'submitted') {
    return {
      error: new UnexpectedState(
        `record status for ${record.piece} is "${record.status}"`
      ),
    }
  }

  const filecoinAcceptInv = await Storefront.filecoinAccept(
    context.storefrontService.invocationConfig,
    record.content,
    record.piece,
    { connection: context.storefrontService.connection }
  )

  if (filecoinAcceptInv.out.error) {
    return {
      error: filecoinAcceptInv.out.error,
    }
  }

  return { ok: {} }
}

/**
 * @param {import('./api.js').CronContext} context
 */
export const handleCronTick = async (context) => {
  const submittedPieces = await context.pieceStore.query({
    status: 'submitted',
  })
  if (submittedPieces.error) {
    return {
      error: submittedPieces.error,
    }
  }
  // Update approved pieces from the ones resolved
  const updatedResponses = await pMap(
    submittedPieces.ok,
    (pieceRecord) =>
      updatePiecesWithDeal({
        id: context.id,
        aggregatorId: context.aggregatorId,
        pieceRecord,
        pieceStore: context.pieceStore,
        taskStore: context.taskStore,
        receiptStore: context.receiptStore,
      }),
    {
      concurrency: 20,
    }
  )

  // Fail if one or more update operations did not succeed.
  // The successful ones are still valid, but we should keep track of errors for monitoring/alerting.
  const updateErrorResponse = updatedResponses.find((r) => r.error)
  if (updateErrorResponse) {
    return {
      error: updateErrorResponse.error,
    }
  }

  // Return successful update operation
  // Include in response the ones that were Updated, and the ones still pending response.
  const updatedPiecesCount = updatedResponses.filter(
    (r) => r.ok?.updated
  ).length
  return {
    ok: {
      updatedCount: updatedPiecesCount,
      pendingCount: updatedResponses.length - updatedPiecesCount,
    },
  }
}

/**
 * Read receipt chain to determine if an aggregate was accepted for the piece.
 * Update its status if there is an accepted aggregate.
 *
 * @param {object} context
 * @param {import('@ucanto/interface').Signer} context.id
 * @param {import('@ucanto/interface').Principal} context.aggregatorId
 * @param {PieceRecord} context.pieceRecord
 * @param {PieceStore} context.pieceStore
 * @param {API.Store<import('@ucanto/interface').UnknownLink, API.UcantoInterface.Invocation>} context.taskStore
 * @param {API.Store<import('@ucanto/interface').UnknownLink, API.UcantoInterface.Receipt>} context.receiptStore
 */
async function updatePiecesWithDeal({
  id,
  aggregatorId,
  pieceRecord,
  pieceStore,
  taskStore,
  receiptStore,
}) {
  let aggregateAcceptReceipt

  let task = /** @type {API.UcantoInterface.Link} */ (
    (
      await AggregatorCaps.pieceOffer
        .invoke({
          issuer: id,
          audience: aggregatorId,
          with: id.did(),
          nb: {
            piece: pieceRecord.piece,
            group: pieceRecord.group,
          },
          expiration: Infinity,
        })
        .delegate()
    ).cid
  )

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [taskRes, receiptRes] = await Promise.all([
      taskStore.get(task),
      receiptStore.get(task),
    ])
    // Should fail if errored and not with StoreNotFound Error
    if (
      (taskRes.error && taskRes.error.name !== RecordNotFoundErrorName) ||
      (receiptRes.error && receiptRes.error.name !== RecordNotFoundErrorName)
    ) {
      return {
        error: taskRes.error || receiptRes.error,
      }
    }
    // Might not be available still, as piece is in progress to get into a deal
    if (taskRes.error || receiptRes.error) {
      // Store not found
      break
    }

    // Save very last receipt - aggregate/accept
    const ability = taskRes.ok.capabilities[0]?.can
    if (ability === 'aggregate/accept') {
      aggregateAcceptReceipt = receiptRes.ok
    }
    if (!receiptRes.ok.fx.join) break
    task = receiptRes.ok.fx.join.link()
  }

  // If there is a receipt, status can be updated
  if (aggregateAcceptReceipt) {
    const updateRes = await pieceStore.update(
      {
        piece: pieceRecord.piece,
      },
      {
        // eslint-disable-next-line no-extra-boolean-cast
        status: !!aggregateAcceptReceipt.out.ok ? 'accepted' : 'invalid',
        updatedAt: new Date().toISOString(),
      }
    )

    if (updateRes.ok) {
      return {
        ok: {
          updated: true,
        },
      }
    }
  }

  return {
    ok: {
      updated: false,
    },
  }
}

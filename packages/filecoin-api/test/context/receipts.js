import { Receipt } from '@ucanto/core'
import * as AggregatorCaps from '@web3-storage/capabilities/filecoin/aggregator'
import * as DealerCaps from '@web3-storage/capabilities/filecoin/dealer'

import * as API from '../../src/types.js'

/**
 * @param {object} context
 * @param {import('@ucanto/interface').Signer} context.storefront
 * @param {import('@ucanto/interface').Signer} context.aggregator
 * @param {import('@ucanto/interface').Signer} context.dealer
 * @param {API.PieceLink} context.aggregate
 * @param {string} context.group
 * @param {API.PieceLink} context.piece
 * @param {import('@ucanto/interface').Block} context.piecesBlock
 * @param {API.InclusionProof} context.inclusionProof
 * @param {API.AggregateAcceptSuccess} context.dealMetadata
 */
export async function createInvocationsAndReceiptsForDealDataProofChain({
  storefront,
  aggregator,
  dealer,
  aggregate,
  group,
  piece,
  piecesBlock,
  inclusionProof,
  dealMetadata,
}) {
  const pieceOfferInvocation = await AggregatorCaps.pieceOffer
    .invoke({
      issuer: storefront,
      audience: aggregator,
      with: storefront.did(),
      nb: {
        piece,
        group,
      },
      expiration: Infinity,
    })
    .delegate()
  const pieceAcceptInvocation = await AggregatorCaps.pieceAccept
    .invoke({
      issuer: aggregator,
      audience: aggregator,
      with: aggregator.did(),
      nb: {
        piece,
        group,
      },
      expiration: Infinity,
    })
    .delegate()
  const aggregateOfferInvocation = await DealerCaps.aggregateOffer
    .invoke({
      issuer: aggregator,
      audience: dealer,
      with: aggregator.did(),
      nb: {
        pieces: piecesBlock.cid,
        aggregate,
      },
      expiration: Infinity,
    })
    .delegate()
  aggregateOfferInvocation.attach(piecesBlock)
  const aggregateAcceptInvocation = await DealerCaps.aggregateAccept
    .invoke({
      issuer: aggregator,
      audience: dealer,
      with: aggregator.did(),
      nb: {
        pieces: piecesBlock.cid,
        aggregate,
      },
      expiration: Infinity,
    })
    .delegate()
  const pieceOfferReceipt = await Receipt.issue({
    issuer: aggregator,
    ran: pieceOfferInvocation.cid,
    result: {
      ok: /** @type {API.PieceOfferSuccess} */ ({
        piece,
      }),
    },
    fx: {
      join: pieceAcceptInvocation.cid,
      fork: [],
    },
  })

  const pieceAcceptReceipt = await Receipt.issue({
    issuer: aggregator,
    ran: pieceAcceptInvocation.cid,
    result: {
      ok: /** @type {API.PieceAcceptSuccess} */ ({
        piece,
        aggregate,
        inclusion: inclusionProof,
      }),
    },
    fx: {
      join: aggregateOfferInvocation.cid,
      fork: [],
    },
  })

  const aggregateOfferReceipt = await Receipt.issue({
    issuer: aggregator,
    ran: aggregateOfferInvocation.cid,
    result: {
      ok: /** @type {API.AggregateOfferSuccess} */ ({
        aggregate,
      }),
    },
    fx: {
      join: aggregateAcceptInvocation.cid,
      fork: [],
    },
  })

  const aggregateAcceptReceipt = await Receipt.issue({
    issuer: dealer,
    ran: aggregateAcceptInvocation.cid,
    result: {
      ok: /** @type {API.AggregateAcceptSuccess} */ (dealMetadata),
    },
  })

  return {
    invocations: {
      pieceOfferInvocation,
      pieceAcceptInvocation,
      aggregateOfferInvocation,
      aggregateAcceptInvocation,
    },
    receipts: {
      pieceOfferReceipt,
      pieceAcceptReceipt,
      aggregateOfferReceipt,
      aggregateAcceptReceipt,
    },
  }
}

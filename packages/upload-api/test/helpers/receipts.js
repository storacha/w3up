import * as API from '../../src/types.js'
import { Receipt, CBOR } from '@ucanto/core'
import * as Signer from '@ucanto/principal/ed25519'
import * as StorefrontCaps from '@web3-storage/capabilities/filecoin/storefront'
import * as AggregatorCaps from '@web3-storage/capabilities/filecoin/aggregator'
import * as DealerCaps from '@web3-storage/capabilities/filecoin/dealer'
import { randomAggregate } from '@web3-storage/filecoin-api/test'

export const getReceipts = async () => {
  const agentSigner = await Signer.generate()
  const storefrontSigner = await Signer.generate()
  const group = storefrontSigner.did()
  const { pieces, aggregate } = await randomAggregate(10, 128)
  const piece = pieces[0]

  // Create inclusion proof
  const inclusionProof = aggregate.resolveProof(piece.link)
  if (inclusionProof.error) {
    throw new Error('could not compute inclusion proof')
  }
  // Create block
  const offer = pieces.map((p) => p.link)
  const piecesBlock = await CBOR.write(offer)
  const dealMetadata = {
    dataType: 0n,
    dataSource: {
      dealID: 100n,
    },
  }

  const filecoinOfferInvocation = await StorefrontCaps.filecoinOffer
    .invoke({
      issuer: agentSigner,
      audience: storefrontSigner,
      with: agentSigner.did(),
      nb: {
        piece: piece.link,
        content: piece.content,
      },
      expiration: Infinity,
    })
    .delegate()
  const filecoinSubmitInvocation = await StorefrontCaps.filecoinSubmit
    .invoke({
      issuer: storefrontSigner,
      audience: storefrontSigner,
      with: storefrontSigner.did(),
      nb: {
        piece: piece.link,
        content: piece.content,
      },
      expiration: Infinity,
    })
    .delegate()
  const filecoinAcceptInvocation = await StorefrontCaps.filecoinAccept
    .invoke({
      issuer: storefrontSigner,
      audience: storefrontSigner,
      with: storefrontSigner.did(),
      nb: {
        piece: piece.link,
        content: piece.content,
      },
      expiration: Infinity,
    })
    .delegate()
  const pieceOfferInvocation = await AggregatorCaps.pieceOffer
    .invoke({
      issuer: storefrontSigner,
      audience: storefrontSigner,
      with: storefrontSigner.did(),
      nb: {
        piece: piece.link,
        group,
      },
      expiration: Infinity,
    })
    .delegate()
  const pieceAcceptInvocation = await AggregatorCaps.pieceAccept
    .invoke({
      issuer: storefrontSigner,
      audience: storefrontSigner,
      with: storefrontSigner.did(),
      nb: {
        piece: piece.link,
        group,
      },
      expiration: Infinity,
    })
    .delegate()
  const aggregateOfferInvocation = await DealerCaps.aggregateOffer
    .invoke({
      issuer: storefrontSigner,
      audience: storefrontSigner,
      with: storefrontSigner.did(),
      nb: {
        pieces: piecesBlock.cid,
        aggregate: aggregate.link,
      },
      expiration: Infinity,
    })
    .delegate()
  aggregateOfferInvocation.attach(piecesBlock)
  const aggregateAcceptInvocation = await DealerCaps.aggregateAccept
    .invoke({
      issuer: storefrontSigner,
      audience: storefrontSigner,
      with: storefrontSigner.did(),
      nb: {
        pieces: piecesBlock.cid,
        aggregate: aggregate.link,
      },
      expiration: Infinity,
    })
    .delegate()

  // Receipts
  const filecoinOfferReceipt = await Receipt.issue({
    issuer: storefrontSigner,
    ran: filecoinOfferInvocation.cid,
    result: {
      ok: /** @type {API.FilecoinOfferSuccess} */ ({
        piece: piece.link,
      }),
    },
    fx: {
      join: filecoinAcceptInvocation.cid,
      fork: [filecoinSubmitInvocation.cid],
    },
  })

  const filecoinSubmitReceipt = await Receipt.issue({
    issuer: storefrontSigner,
    ran: filecoinSubmitInvocation.cid,
    result: {
      ok: /** @type {API.FilecoinSubmitSuccess} */ ({
        piece: piece.link,
      }),
    },
    fx: {
      join: pieceOfferInvocation.cid,
      fork: [],
    },
  })

  const filecoinAcceptReceipt = await Receipt.issue({
    issuer: storefrontSigner,
    ran: filecoinAcceptInvocation.cid,
    result: {
      ok: {
        piece: piece.link,
        aggregate: aggregate.link,
        inclusion: inclusionProof.ok,
        aux: dealMetadata,
      },
    },
    fx: {
      join: undefined,
      fork: [],
    },
  })

  const pieceOfferReceipt = await Receipt.issue({
    issuer: storefrontSigner,
    ran: pieceOfferInvocation.cid,
    result: {
      ok: /** @type {API.PieceOfferSuccess} */ ({
        piece: piece.link,
      }),
    },
    fx: {
      join: pieceAcceptInvocation.cid,
      fork: [],
    },
  })

  const pieceAcceptReceipt = await Receipt.issue({
    issuer: storefrontSigner,
    ran: pieceAcceptInvocation.cid,
    result: {
      ok: {
        piece: piece.link,
        aggregate: aggregate.link,
        inclusion: inclusionProof.ok,
      },
    },
    fx: {
      join: aggregateOfferInvocation.cid,
      fork: [],
    },
  })

  const aggregateOfferReceipt = await Receipt.issue({
    issuer: storefrontSigner,
    ran: aggregateOfferInvocation.cid,
    result: {
      ok: /** @type {API.AggregateOfferSuccess} */ ({
        aggregate: aggregate.link,
      }),
    },
    fx: {
      join: aggregateAcceptInvocation.cid,
      fork: [],
    },
  })

  const aggregateAcceptReceipt = await Receipt.issue({
    issuer: storefrontSigner,
    ran: aggregateAcceptInvocation.cid,
    result: {
      ok: /** @type {API.AggregateAcceptSuccess} */ ({
        ...dealMetadata,
        aggregate: aggregate.link,
      }),
    },
  })

  return [
    filecoinOfferReceipt,
    filecoinSubmitReceipt,
    pieceOfferReceipt,
    pieceAcceptReceipt,
    aggregateOfferReceipt,
    aggregateAcceptReceipt,
    filecoinAcceptReceipt,
  ]
}

import * as Server from '@ucanto/server'
import { CBOR } from '@ucanto/core'
import { Node, Aggregate as AggregateBuilder } from '@web3-storage/data-segment'
import * as Aggregate from '@web3-storage/capabilities/aggregate'
import * as Offer from '@web3-storage/capabilities/offer'
import * as API from '../types.js'

export const MIN_SIZE = 1 + 127 * (1 << 27)
// export const MAX_SIZE = 127 * (1 << 28)
export const MAX_SIZE = AggregateBuilder.DEFAULT_DEAL_SIZE

/**
 * @param {API.AggregateServiceContext} context
 */
export const provide = (context) =>
  Server.provideAdvanced({
    capability: Aggregate.offer,
    handler: (input) => claim(input, context),
  })

/**
 * @param {API.Input<Aggregate.offer>} input
 * @param {API.AggregateServiceContext} context
 * @returns {Promise<API.UcantoInterface.Result<API.AggregateOfferSuccess, API.AggregateOfferFailure> | API.UcantoInterface.JoinBuilder<API.AggregateOfferSuccess>>}
 */
export const claim = async (
  { capability, invocation, context },
  { offerStore }
) => {
  // Get offer block
  const offerCid = capability.nb.offer
  const piece = capability.nb.piece
  const offers = getOfferBlock(offerCid, invocation.iterateIPLDBlocks())

  if (!offers) {
    return {
      error: new AggregateOfferBlockNotFoundError(
        `missing offer block in invocation: ${offerCid.toString()}`
      ),
    }
  }

  // Validate offer content
  const aggregateLeafs = 2n ** BigInt(piece.height)
  const aggregateSize = aggregateLeafs * BigInt(Node.Size)

  if (aggregateSize < MIN_SIZE) {
    return {
      error: new AggregateOfferInvalidSizeError(
        `offer under size, offered: ${aggregateSize}, minimum: ${MIN_SIZE}`
      ),
    }
  } else if (aggregateSize > MAX_SIZE) {
    return {
      error: new AggregateOfferInvalidSizeError(
        `offer over size, offered: ${aggregateSize}, maximum: ${MAX_SIZE}`
      ),
    }
  }

  // Validate commP of commPs
  const aggregateBuild = AggregateBuilder.build({
    pieces: offers.map((o) => ({
      link: o.link,
      size: 2n ** BigInt(o.height) * BigInt(Node.Size),
    })),
  })
  if (!aggregateBuild.link.equals(piece.link)) {
    return {
      error: new AggregateOfferInvalidSizeError(
        `aggregate piece CID mismatch, specified: ${piece.link}, computed: ${aggregateBuild.link}`
      ),
    }
  } else if (aggregateBuild.height !== piece.height) {
    return {
      error: new AggregateOfferInvalidSizeError(
        `aggregate height mismatch, specified: ${piece.height}, computed: ${aggregateBuild.height}`
      ),
    }
  }

  // Create effect for receipt
  const fx = await Offer.arrange
    .invoke({
      issuer: context.id,
      audience: context.id,
      with: context.id.did(),
      nb: {
        pieceLink: piece.link,
      },
    })
    .delegate()

  // Write offer to store
  await offerStore.queue({ piece, offers })

  return Server.ok({
    status: 'queued',
  }).join(fx.link())
}

/**
 * @param {Server.API.Link<unknown, number, number, 0 | 1>} offerCid
 * @param {IterableIterator<Server.API.Transport.Block<unknown, number, number, 1>>} blockIterator
 */
function getOfferBlock(offerCid, blockIterator) {
  for (const block of blockIterator) {
    if (block.cid.equals(offerCid)) {
      const decoded =
        /** @type {import('@web3-storage/aggregate-client/types').Piece[]} */ (
          CBOR.decode(block.bytes)
        )
      return decoded
      // TODO: Validate with schema
    }
  }
}

class AggregateOfferInvalidSizeError extends Server.Failure {
  get name() {
    return /** @type {const} */ ('AggregateOfferInvalidSize')
  }
}

class AggregateOfferBlockNotFoundError extends Server.Failure {
  get name() {
    return /** @type {const} */ ('AggregateOfferBlockNotFound')
  }
}

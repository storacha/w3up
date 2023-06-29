import * as Server from '@ucanto/server'
import { CBOR } from '@ucanto/core'
import * as Aggregate from '@web3-storage/capabilities/aggregate'
import * as Offer from '@web3-storage/capabilities/offer'
import * as API from '../types.js'

export const MIN_SIZE = 1 + 127 * (1 << 27)
export const MAX_SIZE = 127 * (1 << 28)

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
  const offers = getOfferBlock(offerCid, invocation)

  if (!offers) {
    return {
      error: new AggregateOfferBlockNotFoundError(
        `missing offer block in invocation: ${offerCid.toString()}`
      ),
    }
  }

  // Validate offer content
  const size = offers.reduce((accum, offer) => accum + offer.size, 0)
  if (size < MIN_SIZE) {
    return {
      error: new AggregateOfferInvalidSizeError(
        `offer under size, offered: ${size}, minimum: ${MIN_SIZE}`
      ),
    }
  } else if (size > MAX_SIZE) {
    return {
      error: new AggregateOfferInvalidSizeError(
        `offer over size, offered: ${size}, maximum: ${MAX_SIZE}`
      ),
    }
  } else if (size !== piece.size) {
    return {
      error: new AggregateOfferInvalidSizeError(
        `offer size mismatch, specified: ${piece.size}, actual: ${size}`
      ),
    }
  }

  // TODO: Validate commP of commPs

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
 * @param {Server.API.Invocation<Server.API.Capability<"aggregate/offer", `did:${string}:${string}` & `did:${string}` & Server.API.Phantom<{ protocol: "did:"; }> & `${string}:${string}` & Server.API.Phantom<{ protocol: `${string}:`; }>, Pick<{ offer: Server.API.Link<unknown, number, number, 0 | 1>; piece: Server.Schema.InferStruct<{ link: Server.Schema.Schema<Server.API.Link<unknown, number, number, 0 | 1>, any>; size: Server.Schema.NumberSchema<number & Server.API.Phantom<{ typeof: "integer"; }>, unknown>; }>; }, "offer" | "piece"> & Partial<Pick<{ offer: Server.API.Link<unknown, number, number, 0 | 1>; piece: Server.Schema.InferStruct<{ link: Server.Schema.Schema<Server.API.Link<unknown, number, number, 0 | 1>, any>; size: Server.Schema.NumberSchema<number & Server.API.Phantom<{ typeof: "integer"; }>, unknown>; }>; }, never>>>>} invocation
 */
function getOfferBlock(offerCid, invocation) {
  for (const block of invocation.iterateIPLDBlocks()) {
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

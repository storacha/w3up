import { Aggregate, Offer } from '@web3-storage/capabilities'
import { Piece } from '@web3-storage/data-segment'

import { CBOR, parseLink } from '@ucanto/core'
import * as Signer from '@ucanto/principal/ed25519'

import { MIN_SIZE, MAX_SIZE } from '../src/aggregate/offer.js'
import * as API from '../src/types.js'
import { randomAggregate } from './utils.js'
import { createServer, connect } from '../src/lib.js'

/**
 * @type {API.Tests}
 */
export const test = {
  // aggregate/offer tests
  'aggregate/offer inserts valid offer into bucket': async (
    assert,
    context
  ) => {
    const { storeFront } = await getServiceContext()
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // Generate Pieces for offer
    const { pieces, aggregate } = await randomAggregate(100, 128)
    const block = await CBOR.write(pieces)
    const aggregateOfferInvocation = Aggregate.offer.invoke({
      issuer: storeFront,
      audience: connection.id,
      with: storeFront.did(),
      nb: {
        offer: block.cid,
        piece: aggregate,
      },
    })
    aggregateOfferInvocation.attach(block)

    const aggregateOffer = await aggregateOfferInvocation.execute(connection)
    if (aggregateOffer.out.error) {
      throw new Error('invocation failed', { cause: aggregateOffer.out.error })
    }
    assert.ok(aggregateOffer.out.ok)
    assert.deepEqual(aggregateOffer.out.ok.status, 'queued')

    // Validate effect in receipt
    const fx = await Offer.arrange
      .invoke({
        issuer: context.id,
        audience: context.id,
        with: context.id.did(),
        nb: {
          pieceLink: aggregate.link,
        },
      })
      .delegate()

    assert.ok(aggregateOffer.fx.join)
    assert.ok(fx.link().equals(aggregateOffer.fx.join?.link()))
  },
  'aggregate/offer fails when offer block is not attached': async (
    assert,
    context
  ) => {
    const { storeFront } = await getServiceContext()
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // Generate Pieces for offer
    const { pieces, aggregate } = await randomAggregate(100, 128)
    const block = await CBOR.write(pieces)
    const aggregateOfferInvocation = Aggregate.offer.invoke({
      issuer: storeFront,
      audience: connection.id,
      with: storeFront.did(),
      nb: {
        offer: block.cid,
        piece: aggregate,
      },
    })

    const aggregateOffer = await aggregateOfferInvocation.execute(connection)
    assert.ok(aggregateOffer.out.error)
    assert.deepEqual(
      aggregateOffer.out.error?.message,
      `missing offer block in invocation: ${block.cid.toString()}`
    )

    // Validate effect in receipt does not exist
    assert.ok(!aggregateOffer.fx.join)
  },
  'aggregate/offer fails when size is not enough for offer': async (
    assert,
    context
  ) => {
    const { storeFront } = await getServiceContext()
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // Generate Pieces for offer
    const { pieces, aggregate } = await randomAggregate(100, 128)
    const badHeight = 3
    const size = Piece.PaddedSize.fromHeight(badHeight)

    const block = await CBOR.write(pieces)
    const aggregateOfferInvocation = Aggregate.offer.invoke({
      issuer: storeFront,
      audience: connection.id,
      with: storeFront.did(),
      nb: {
        offer: block.cid,
        piece: {
          ...aggregate,
          height: badHeight,
        },
      },
    })
    aggregateOfferInvocation.attach(block)

    const aggregateOffer = await aggregateOfferInvocation.execute(connection)
    assert.ok(aggregateOffer.out.error)
    // TODO: compute size
    assert.deepEqual(
      aggregateOffer.out.error?.message,
      `offer under size, offered: ${Number(size)}, minimum: ${MIN_SIZE}`
    )

    // Validate effect in receipt does not exist
    assert.ok(!aggregateOffer.fx.join)
  },
  'aggregate/offer fails when size is above limit for offer': async (
    assert,
    context
  ) => {
    const { storeFront } = await getServiceContext()
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // Generate Pieces for offer
    const { pieces, aggregate } = await randomAggregate(100, 128)
    const badHeight = 31
    const size = Piece.PaddedSize.fromHeight(badHeight)

    const block = await CBOR.write(pieces)
    const aggregateOfferInvocation = Aggregate.offer.invoke({
      issuer: storeFront,
      audience: connection.id,
      with: storeFront.did(),
      nb: {
        offer: block.cid,
        piece: {
          ...aggregate,
          height: badHeight,
        },
      },
    })
    aggregateOfferInvocation.attach(block)

    const aggregateOffer = await aggregateOfferInvocation.execute(connection)
    assert.ok(aggregateOffer.out.error)
    assert.deepEqual(
      aggregateOffer.out.error?.message,
      `offer over size, offered: ${size}, maximum: ${MAX_SIZE}`
    )

    // Validate effect in receipt does not exist
    assert.ok(!aggregateOffer.fx.join)
  },
  'aggregate/offer fails when provided height is different than computed':
    async (assert, context) => {
      const { storeFront } = await getServiceContext()
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // Generate Pieces for offer
      const { pieces, aggregate } = await randomAggregate(100, 128)
      const badHeight = 29

      const block = await CBOR.write(pieces)
      const aggregateOfferInvocation = Aggregate.offer.invoke({
        issuer: storeFront,
        audience: connection.id,
        with: storeFront.did(),
        nb: {
          offer: block.cid,
          piece: {
            link: aggregate.link,
            height: badHeight,
          },
        },
      })
      aggregateOfferInvocation.attach(block)

      const aggregateOffer = await aggregateOfferInvocation.execute(connection)
      assert.ok(aggregateOffer.out.error)

      // Validate effect in receipt does not exist
      assert.ok(!aggregateOffer.fx.join)
    },
  'aggregate/offer fails when provided piece CID is different than computed':
    async (assert, context) => {
      const { storeFront } = await getServiceContext()
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // Generate Pieces for offer
      const { pieces, aggregate } = await randomAggregate(100, 128)
      const badLink =
        /** @type {import('@web3-storage/data-segment').PieceLink} */ (
          parseLink(
            'baga6ea4seaqm2u43527zehkqqcpyyopgsw2c4mapyy2vbqzqouqtzhxtacueeki'
          )
        )

      const block = await CBOR.write(pieces)
      const aggregateOfferInvocation = Aggregate.offer.invoke({
        issuer: storeFront,
        audience: connection.id,
        with: storeFront.did(),
        nb: {
          offer: block.cid,
          piece: {
            link: badLink,
            height: aggregate.height,
          },
        },
      })
      aggregateOfferInvocation.attach(block)

      const aggregateOffer = await aggregateOfferInvocation.execute(connection)
      assert.ok(aggregateOffer.out.error)
      assert.deepEqual(
        aggregateOffer.out.error?.message,
        `aggregate piece CID mismatch, specified: ${badLink}, computed: ${aggregate.link}`
      )

      // Validate effect in receipt does not exist
      assert.ok(!aggregateOffer.fx.join)
    },
  // offer/arrange tests
  'aggregate/arrange can be invoked after aggregate/offer': async (
    assert,
    context
  ) => {
    const { storeFront } = await getServiceContext()
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // Generate Pieces for offer
    const { pieces, aggregate } = await randomAggregate(100, 128)
    // TODO: Inflate size for testing

    const block = await CBOR.write(pieces)
    const aggregateOfferInvocation = Aggregate.offer.invoke({
      issuer: storeFront,
      audience: connection.id,
      with: storeFront.did(),
      nb: {
        offer: block.cid,
        piece: aggregate,
      },
    })
    aggregateOfferInvocation.attach(block)

    const aggregateOffer = await aggregateOfferInvocation.execute(connection)
    if (aggregateOffer.out.error) {
      throw new Error('invocation failed', { cause: aggregateOffer.out.error })
    }
    assert.ok(aggregateOffer.out.ok)

    // Validate effect in receipt
    const fx = await Offer.arrange
      .invoke({
        issuer: context.id,
        audience: context.id,
        with: context.id.did(),
        nb: {
          pieceLink: aggregate.link,
        },
      })
      .delegate()

    const offerArrangeInvocation = Offer.arrange.invoke({
      issuer: context.id,
      audience: context.id,
      with: context.id.did(),
      nb: {
        pieceLink: aggregate.link,
      },
    })

    const offerArrange = await offerArrangeInvocation.execute(connection)
    if (offerArrange.out.error) {
      throw new Error('invocation failed', { cause: offerArrange.out.error })
    }
    assert.ok(offerArrange.out.ok)
    assert.ok(offerArrange.ran.link().equals(fx.link()))
  },
  // aggregate/get tests
  'aggregate/get fails when requested aggregate does not exist': async (
    assert,
    context
  ) => {
    const { storeFront } = await getServiceContext()
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const subject =
      /** @type {import('@web3-storage/data-segment').PieceLink} */ (
        parseLink(
          'baga6ea4seaqm2u43527zehkqqcpyyopgsw2c4mapyy2vbqzqouqtzhxtacueeki'
        )
      )
    const aggregateGetInvocation = Aggregate.get.invoke({
      issuer: storeFront,
      audience: connection.id,
      with: storeFront.did(),
      nb: {
        subject,
      },
    })

    const aggregateGet = await aggregateGetInvocation.execute(connection)
    assert.ok(aggregateGet.out.error)
  },
  // aggregate/get tests
  'aggregate/get returns known deals for given commitment proof': async (
    assert,
    context
  ) => {
    const { storeFront } = await getServiceContext()
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const subject =
      /** @type {import('@web3-storage/data-segment').PieceLink} */ (
        parseLink(
          'baga6ea4seaqm2u43527zehkqqcpyyopgsw2c4mapyy2vbqzqouqtzhxtacueeki'
        )
      )
    const deal = {
      status: 'done',
    }
    await context.aggregateStoreBackend.put(subject, deal)

    const aggregateGetInvocation = Aggregate.get.invoke({
      issuer: storeFront,
      audience: connection.id,
      with: storeFront.did(),
      nb: {
        subject,
      },
    })

    const aggregateGet = await aggregateGetInvocation.execute(connection)
    if (aggregateGet.out.error) {
      throw new Error('invocation failed', { cause: aggregateGet.out.error })
    }
    assert.equal(aggregateGet.out.ok.deals.length, 1)
    assert.deepEqual(aggregateGet.out.ok.deals[0], deal)
  },
}

async function getServiceContext() {
  const storeFront = await Signer.generate()

  return { storeFront }
}

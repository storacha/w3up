import { Aggregate, Offer } from '@web3-storage/capabilities'

import { CBOR, parseLink } from '@ucanto/core'
import * as Signer from '@ucanto/principal/ed25519'

import { MIN_SIZE, MAX_SIZE } from '../src/aggregate/offer.js'
import * as API from '../src/types.js'
import { randomCARs } from './utils.js'
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

    // Generate CAR Files for offer
    const offers = (await randomCARs(100, 100))
      // Inflate size for testing within range
      .map((car) => ({
        ...car,
        size: car.size * 10e5,
      }))
    const size = offers.reduce((accum, offer) => accum + offer.size, 0)
    const commitmentProof = parseLink(
      'baga6ea4seaqm2u43527zehkqqcpyyopgsw2c4mapyy2vbqzqouqtzhxtacueeki'
    )

    const block = await CBOR.write(offers)
    const aggregateOfferInvocation = Aggregate.offer.invoke({
      issuer: storeFront,
      audience: connection.id,
      with: storeFront.did(),
      nb: {
        offer: block.cid,
        commitmentProof,
        size,
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
          commitmentProof,
        },
      })
      .delegate()

    assert.ok(aggregateOffer.fx.join)
    assert.ok(fx.link().equals(aggregateOffer.fx.join))
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

    // Generate CAR Files for offer
    const offers = await randomCARs(100, 100)
    const size = offers.reduce((accum, offer) => accum + offer.size, 0)
    const commitmentProof = parseLink(
      'baga6ea4seaqm2u43527zehkqqcpyyopgsw2c4mapyy2vbqzqouqtzhxtacueeki'
    )

    const block = await CBOR.write(offers)
    const aggregateOfferInvocation = Aggregate.offer.invoke({
      issuer: storeFront,
      audience: connection.id,
      with: storeFront.did(),
      nb: {
        offer: block.cid,
        commitmentProof,
        size,
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

    // Generate CAR Files for offer
    const offers = await randomCARs(100, 100)
    const size = offers.reduce((accum, offer) => accum + offer.size, 0)
    const commitmentProof = parseLink(
      'baga6ea4seaqm2u43527zehkqqcpyyopgsw2c4mapyy2vbqzqouqtzhxtacueeki'
    )

    const block = await CBOR.write(offers)
    const aggregateOfferInvocation = Aggregate.offer.invoke({
      issuer: storeFront,
      audience: connection.id,
      with: storeFront.did(),
      nb: {
        offer: block.cid,
        commitmentProof,
        size,
      },
    })
    aggregateOfferInvocation.attach(block)

    const aggregateOffer = await aggregateOfferInvocation.execute(connection)
    assert.ok(aggregateOffer.out.error)
    assert.deepEqual(
      aggregateOffer.out.error?.message,
      `offer under size, offered: ${size}, minimum: ${MIN_SIZE}`
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

    // Generate CAR Files for offer
    const offers = (await randomCARs(100, 100))
      // Inflate size for testing above range
      .map((car) => ({
        ...car,
        size: car.size * 10e6,
      }))
    const size = offers.reduce((accum, offer) => accum + offer.size, 0)
    const commitmentProof = parseLink(
      'baga6ea4seaqm2u43527zehkqqcpyyopgsw2c4mapyy2vbqzqouqtzhxtacueeki'
    )

    const block = await CBOR.write(offers)
    const aggregateOfferInvocation = Aggregate.offer.invoke({
      issuer: storeFront,
      audience: connection.id,
      with: storeFront.did(),
      nb: {
        offer: block.cid,
        commitmentProof,
        size,
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
  'aggregate/offer fails when provided size is different than for offer':
    async (assert, context) => {
      const { storeFront } = await getServiceContext()
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // Generate CAR Files for offer
      const offers = (await randomCARs(100, 100))
        // Inflate size for testing above range
        .map((car) => ({
          ...car,
          size: car.size * 10e5,
        }))
      const size = offers.reduce((accum, offer) => accum + offer.size, 0)
      const badSize = size - 1000
      const commitmentProof = parseLink(
        'baga6ea4seaqm2u43527zehkqqcpyyopgsw2c4mapyy2vbqzqouqtzhxtacueeki'
      )

      const block = await CBOR.write(offers)
      const aggregateOfferInvocation = Aggregate.offer.invoke({
        issuer: storeFront,
        audience: connection.id,
        with: storeFront.did(),
        nb: {
          offer: block.cid,
          commitmentProof,
          size: badSize,
        },
      })
      aggregateOfferInvocation.attach(block)

      const aggregateOffer = await aggregateOfferInvocation.execute(connection)
      assert.ok(aggregateOffer.out.error)
      assert.deepEqual(
        aggregateOffer.out.error?.message,
        `offer size mismatch, specified: ${badSize}, actual: ${size}`
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

    // Generate CAR Files for offer
    const offers = (await randomCARs(100, 100))
      // Inflate size for testing within range
      .map((car) => ({
        ...car,
        size: car.size * 10e5,
      }))
    const size = offers.reduce((accum, offer) => accum + offer.size, 0)
    const commitmentProof = parseLink(
      'baga6ea4seaqm2u43527zehkqqcpyyopgsw2c4mapyy2vbqzqouqtzhxtacueeki'
    )

    const block = await CBOR.write(offers)
    const aggregateOfferInvocation = Aggregate.offer.invoke({
      issuer: storeFront,
      audience: connection.id,
      with: storeFront.did(),
      nb: {
        offer: block.cid,
        commitmentProof,
        size,
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
          commitmentProof,
        },
      })
      .delegate()

    const offerArrangeInvocation = Offer.arrange.invoke({
      issuer: context.id,
      audience: context.id,
      with: context.id.did(),
      nb: {
        commitmentProof,
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

    const commitmentProof = parseLink(
      'baga6ea4seaqm2u43527zehkqqcpyyopgsw2c4mapyy2vbqzqouqtzhxtacueeki'
    )
    const aggregateGetInvocation = Aggregate.get.invoke({
      issuer: storeFront,
      audience: connection.id,
      with: storeFront.did(),
      nb: {
        commitmentProof,
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

    const commitmentProof = parseLink(
      'baga6ea4seaqm2u43527zehkqqcpyyopgsw2c4mapyy2vbqzqouqtzhxtacueeki'
    )
    const deal = {
      status: 'done',
    }
    await context.aggregateStoreBackend.put(commitmentProof, deal)

    const aggregateGetInvocation = Aggregate.get.invoke({
      issuer: storeFront,
      audience: connection.id,
      with: storeFront.did(),
      nb: {
        commitmentProof,
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

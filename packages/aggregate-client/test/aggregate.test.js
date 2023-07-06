import assert from 'assert'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as Signer from '@ucanto/principal/ed25519'
import * as CAR from '@ucanto/transport/car'
import { CBOR, parseLink } from '@ucanto/core'
import * as AggregateCapabilities from '@web3-storage/capabilities/aggregate'
import * as OfferCapabilities from '@web3-storage/capabilities/offer'

import * as Aggregate from '../src/aggregate.js'

import { serviceProvider } from './fixtures.js'
import { mockService } from './helpers/mocks.js'
import { randomCargo } from './helpers/random.js'

describe('aggregate.offer', () => {
  it('places a valid offer with the service', async () => {
    const { storeFront } = await getContext()

    // Generate CAR Files for offer
    const offers = (await randomCargo(100, 100))
      // Inflate size for testing within range
      .map((car) => ({
        ...car,
        size: car.size * 10e5,
      }))
    const size = offers.reduce((accum, offer) => accum + offer.size, 0)
    const offerBlock = await CBOR.write(offers)
    /** @type {import('@web3-storage/capabilities/types').AggregateOfferSuccess} */
    const aggregateOfferResponse = {
      status: 'queued',
    }
    // TODO: This should be generated with commP of commPs builder
    const piece = {
      link: parseLink(
        'baga6ea4seaqm2u43527zehkqqcpyyopgsw2c4mapyy2vbqzqouqtzhxtacueeki'
      ),
      size,
    }

    // Create Ucanto service
    const service = mockService({
      aggregate: {
        offer: Server.provideAdvanced({
          capability: AggregateCapabilities.offer,
          // @ts-expect-error not failure type expected because of assert throw
          handler: async ({ invocation, context }) => {
            assert.strictEqual(invocation.issuer.did(), storeFront.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, AggregateCapabilities.offer.can)
            assert.equal(invCap.with, invocation.issuer.did())
            // size
            assert.strictEqual(invCap.nb?.piece.size, size)
            assert.ok(invCap.nb?.piece.link)
            // TODO: Validate commitmemnt proof
            assert.ok(invCap.nb?.offer)
            // Validate block inline exists
            const invocationBlocks = Array.from(invocation.iterateIPLDBlocks())
            assert.ok(
              invocationBlocks.find((b) => b.cid.equals(offerBlock.cid))
            )

            // Create effect for receipt
            const fx = await OfferCapabilities.arrange
              .invoke({
                issuer: context.id,
                audience: context.id,
                with: context.id.did(),
                nb: {
                  pieceLink: invCap.nb?.piece.link,
                },
              })
              .delegate()

            return Server.ok(aggregateOfferResponse).join(fx.link())
          },
        }),
      },
    })
    const res = await Aggregate.aggregateOffer(
      {
        issuer: storeFront,
        with: storeFront.did(),
        audience: serviceProvider,
      },
      // @ts-expect-error link not explicitly with commP codec
      piece,
      offers,
      { connection: getConnection(service).connection }
    )
    assert.ok(res.out.ok)
    assert.deepEqual(res.out.ok, aggregateOfferResponse)
    // includes effect fx in receipt
    assert.ok(res.fx.join)
  })
})

describe('aggregate.get', () => {
  it('places a valid offer with the service', async () => {
    const { storeFront } = await getContext()
    const subject = parseLink(
      'baga6ea4seaqm2u43527zehkqqcpyyopgsw2c4mapyy2vbqzqouqtzhxtacueeki'
    )
    /** @type {unknown[]} */
    const deals = []

    // Create Ucanto service
    const service = mockService({
      aggregate: {
        get: Server.provide(AggregateCapabilities.get, ({ invocation }) => {
          assert.strictEqual(invocation.issuer.did(), storeFront.did())
          assert.strictEqual(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.strictEqual(invCap.can, AggregateCapabilities.get.can)
          assert.equal(invCap.with, invocation.issuer.did())
          assert.ok(invCap.nb?.subject)
          return { ok: { deals } }
        }),
      },
    })

    const res = await Aggregate.aggregateGet(
      {
        issuer: storeFront,
        with: storeFront.did(),
        audience: serviceProvider,
      },
      subject,
      // @ts-expect-error no full service implemented
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.ok)
    assert.deepEqual(res.out.ok.deals, deals)
  })
})

async function getContext() {
  const storeFront = await Signer.generate()

  return { storeFront }
}

/**
 * @param {Partial<{
 * aggregate: Partial<import('../src/types').Service['aggregate']>
 * offer: Partial<import('../src/types').Service['offer']>
 * }>} service
 */
function getConnection(service) {
  const server = Server.create({
    id: serviceProvider,
    service,
    codec: CAR.inbound,
  })
  const connection = Client.connect({
    id: serviceProvider,
    codec: CAR.outbound,
    channel: server,
  })

  return { connection }
}

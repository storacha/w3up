import assert from 'assert'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as Signer from '@ucanto/principal/ed25519'
import * as CAR from '@ucanto/transport/car'
import { CBOR } from '@ucanto/core'
import * as AggregateCapabilities from '@web3-storage/capabilities/aggregate'
import * as OfferCapabilities from '@web3-storage/capabilities/offer'

import * as Aggregate from '../src/aggregate.js'

import { serviceProvider } from './fixtures.js'
import { mockService } from './helpers/mocks.js'
import { randomCARs } from './helpers/random.js'

describe('aggregate.offer', () => {
  it('places a valid offer with the service', async () => {
    const { storeFront } = await getContext()

    // Generate CAR Files for offer
    const offers = (await randomCARs(100, 100))
      // Inflate size for testing within range
      .map((car) => ({
        ...car,
        size: car.size * 10e5,
      }))
    const size = offers.reduce((accum, offer) => accum + offer.size, 0)
    const offerBlock = await CBOR.write(offers)
    /** @type {import('../src/types').AggregateOfferResponse} */
    const aggregateOfferResponse = {
      status: 'queued',
    }

    // Create Ucanto service
    const service = mockService({
      aggregate: {
        offer: Server.provideAdvanced({
          capability: AggregateCapabilities.offer,
          handler: async ({ invocation, context }) => {
            assert.strictEqual(invocation.issuer.did(), storeFront.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, AggregateCapabilities.offer.can)
            assert.equal(invCap.with, invocation.issuer.did())
            // size
            assert.strictEqual(invCap.nb?.size, size)
            assert.ok(invCap.nb?.commitmentProof)
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
                  commitmentProof: invCap.nb?.commitmentProof,
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
      offers,
      // @ts-expect-error no full service implemented
      { connection: getConnection(service).connection }
    )
    assert.ok(res.out.ok)
    assert.deepEqual(res.out.ok, aggregateOfferResponse)
    // includes effect fx in receipt
    assert.ok(res.fx.join)
  })

  it('fails to place a offer with larger size than required', async () => {
    const { storeFront } = await getContext()

    // Generate CAR Files for offer
    const offers = (await randomCARs(100, 100))
      // Inflate size for testing above range
      .map((car) => ({
        ...car,
        size: car.size * 10e6,
      }))

    // Create Ucanto service
    const service = mockService({
      aggregate: {
        offer: Server.provide(AggregateCapabilities.offer, () => {
          throw new Error('should not be called')
        }),
      },
    })

    await assert.rejects(
      () =>
        Aggregate.aggregateOffer(
          {
            issuer: storeFront,
            with: storeFront.did(),
            audience: serviceProvider,
          },
          offers,
          // @ts-expect-error no full service implemented
          { connection: getConnection(service).connection }
        ),
      'provided size is larger than it can be accepted for an offer'
    )
  })

  it('fails to place a offer with smaller size than required', async () => {
    const { storeFront } = await getContext()

    // Generate CAR Files for offer
    const offers = await randomCARs(100, 100)

    // Create Ucanto service
    const service = mockService({
      aggregate: {
        offer: Server.provide(AggregateCapabilities.offer, () => {
          throw new Error('should not be called')
        }),
      },
    })

    await assert.rejects(
      () =>
        Aggregate.aggregateOffer(
          {
            issuer: storeFront,
            with: storeFront.did(),
            audience: serviceProvider,
          },
          offers,
          // @ts-expect-error no full service implemented
          { connection: getConnection(service).connection }
        ),
      'provided size is not enough to create an offer'
    )
  })

  it('fails to place a offer with invalid URLs', async () => {
    const { storeFront } = await getContext()

    // Generate CAR Files for offer
    const offers = (await randomCARs(100, 100))
      // Get broken URLs
      .map((car) => ({
        ...car,
        size: car.size * 10e5,
        src: [`${car.link}`],
      }))

    // Create Ucanto service
    const service = mockService({
      aggregate: {
        offer: Server.provide(AggregateCapabilities.offer, () => {
          throw new Error('should not be called')
        }),
      },
    })

    await assert.rejects(
      () =>
        Aggregate.aggregateOffer(
          {
            issuer: storeFront,
            with: storeFront.did(),
            audience: serviceProvider,
          },
          offers,
          // @ts-expect-error no full service implemented
          { connection: getConnection(service).connection }
        ),
      'provided url'
    )
  })
})

describe('aggregate.get', () => {
  it('places a valid offer with the service', async () => {
    const { storeFront } = await getContext()
    const commitmentProof = 'todo-commitmentproof'
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
          assert.ok(invCap.nb?.commitmentProof)
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
      commitmentProof,
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

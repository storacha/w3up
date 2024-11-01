import assert from 'assert'
import * as Signer from '@ucanto/principal/ed25519'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import { CBOR } from '@ucanto/core'
import * as DealerCaps from '@storacha/capabilities/filecoin/dealer'
import * as dagJSON from '@ipld/dag-json'
import { aggregateOffer, aggregateAccept } from '../src/dealer.js'
import { randomAggregate } from './helpers/random.js'
import { validateAuthorization } from './helpers/utils.js'
import { mockService } from './helpers/mocks.js'
import { serviceProvider as dealerService } from './fixtures.js'

describe('dealer', () => {
  it('aggregator offers an aggregate', async () => {
    const { aggregator } = await getContext()
    const { pieces, aggregate } = await randomAggregate(100, 100)
    const offer = pieces.map((p) => p.link)
    const piecesBlock = await CBOR.write(offer)
    /** @type {import('@storacha/capabilities/types').AggregateOfferSuccess} */
    const aggregateOfferResponse = {
      aggregate: aggregate.link,
    }

    // Create Ucanto service
    const service = mockService({
      aggregate: {
        offer: Server.provideAdvanced({
          capability: DealerCaps.aggregateOffer,
          handler: async ({ invocation, context }) => {
            assert.strictEqual(invocation.issuer.did(), aggregator.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, DealerCaps.aggregateOffer.can)
            assert.equal(invCap.with, invocation.issuer.did())
            assert.ok(invCap.nb)

            // piece link
            assert.ok(invCap.nb.aggregate.equals(aggregate.link.link()))

            // Validate block inline exists
            const invocationBlocks = Array.from(invocation.iterateIPLDBlocks())
            assert.ok(
              invocationBlocks.find((b) => b.cid.equals(piecesBlock.cid))
            )

            // Create effect for receipt with self signed queued operation
            const fx = await DealerCaps.aggregateAccept
              .invoke({
                issuer: context.id,
                audience: context.id,
                with: context.id.did(),
                nb: invCap.nb,
                expiration: Infinity,
              })
              .delegate()

            return Server.ok(aggregateOfferResponse).join(fx.link())
          },
        }),
      },
    })

    // invoke aggregate/offer from aggregator
    const res = await aggregateOffer(
      {
        issuer: aggregator,
        with: aggregator.did(),
        audience: dealerService,
      },
      aggregate.link,
      offer,
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.ok)
    assert.ok(res.out.ok.aggregate?.equals(aggregateOfferResponse.aggregate))
    // includes effect fx in receipt
    assert.ok(res.fx.join)
  })

  it('dealer accepts an aggregate', async () => {
    const { pieces, aggregate } = await randomAggregate(100, 100)
    const offer = pieces.map((p) => p.link)
    const piecesBlock = await CBOR.write(offer)

    /** @type {import('@storacha/capabilities/types').AggregateAcceptSuccess} */
    const aggregateAcceptResponse = {
      dataType: 0n,
      dataSource: {
        dealID: 1138n,
      },
      aggregate: aggregate.link,
    }

    // Create Ucanto service
    const service = mockService({
      aggregate: {
        accept: Server.provideAdvanced({
          capability: DealerCaps.aggregateAccept,
          handler: async ({ invocation }) => {
            assert.strictEqual(invocation.issuer.did(), dealerService.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, DealerCaps.aggregateAccept.can)
            assert.equal(invCap.with, invocation.issuer.did())
            assert.ok(invCap.nb)

            // piece link
            assert.ok(invCap.nb.aggregate.equals(aggregate.link.link()))

            return Server.ok(aggregateAcceptResponse)
          },
        }),
      },
    })

    // invoke aggregate accept from dealer
    const res = await aggregateAccept(
      {
        issuer: dealerService,
        with: dealerService.did(),
        audience: dealerService,
      },
      aggregate.link.link(),
      piecesBlock.cid,
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.ok)
    assert.ok(res.out.ok.aggregate.equals(aggregate.link))
    assert.deepEqual(
      BigInt(res.out.ok.dataSource.dealID),
      BigInt(aggregateAcceptResponse.dataSource.dealID)
    )
    // does not include effect fx in receipt
    assert.ok(!res.fx.join)
  })

  it('dealer rejects an aggregate', async () => {
    const { pieces, aggregate } = await randomAggregate(100, 100)
    const offer = pieces.map((p) => p.link)
    const piecesBlock = await CBOR.write(offer)

    /** @type {import('@storacha/capabilities/types').AggregateAcceptFailure} */
    const aggregateAcceptResponse = {
      name: 'InvalidPiece',
      message: 'Aggregate is not a valid piece.',
      // piece 1 was a bad
      cause: [
        {
          name: 'InvalidPieceCID',
          piece: pieces[1].link,
        },
      ],
    }

    // Create Ucanto service
    const service = mockService({
      aggregate: {
        accept: Server.provideAdvanced({
          capability: DealerCaps.aggregateAccept,
          handler: async ({ invocation }) => {
            assert.strictEqual(invocation.issuer.did(), dealerService.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, DealerCaps.aggregateAccept.can)
            assert.equal(invCap.with, invocation.issuer.did())
            assert.ok(invCap.nb)

            // piece link
            assert.ok(invCap.nb.aggregate.equals(aggregate.link.link()))

            return {
              error: aggregateAcceptResponse,
            }
          },
        }),
      },
    })

    // invoke aggregate accept from dealer
    const res = await aggregateAccept(
      {
        issuer: dealerService,
        with: dealerService.did(),
        audience: dealerService,
      },
      aggregate.link.link(),
      piecesBlock.cid,
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.error)
    assert.equal(
      dagJSON.stringify(res.out.error),
      dagJSON.stringify(aggregateAcceptResponse)
    )
    // does not include effect fx in receipt
    assert.ok(!res.fx.join)
  })
})

async function getContext() {
  const aggregator = await Signer.generate()

  return { aggregator }
}

/**
 * @param {import('../src/types.js').DealerService} service
 */
function getConnection(service) {
  const server = Server.create({
    id: dealerService,
    service,
    codec: CAR.inbound,
    validateAuthorization,
  })
  const connection = Client.connect({
    id: dealerService,
    codec: CAR.outbound,
    channel: server,
  })

  return { connection }
}

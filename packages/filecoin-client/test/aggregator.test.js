import assert from 'assert'
import * as Signer from '@ucanto/principal/ed25519'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as AggregatorCaps from '@web3-storage/capabilities/filecoin/aggregator'
import { pieceOffer, pieceAccept } from '../src/aggregator.js'
import { randomAggregate, randomCargo } from './helpers/random.js'
import { mockService } from './helpers/mocks.js'
import { serviceProvider as aggregatorService } from './fixtures.js'

describe('aggregator', () => {
  it('storefront offers a filecoin piece', async () => {
    const { storefront } = await getContext()

    // Generate cargo to add
    const [cargo] = await randomCargo(1, 100)
    const group = 'did:web:free.web3.storage'

    /** @type {import('@web3-storage/capabilities/types').PieceOfferSuccess} */
    const pieceOfferResponse = {
      piece: cargo.link,
    }

    // Create Ucanto service
    const service = mockService({
      piece: {
        offer: Server.provideAdvanced({
          capability: AggregatorCaps.pieceOffer,
          handler: async ({ invocation, context }) => {
            assert.strictEqual(invocation.issuer.did(), storefront.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, AggregatorCaps.pieceOffer.can)
            assert.equal(invCap.with, invocation.issuer.did())
            // piece link
            assert.ok(invCap.nb?.piece.equals(cargo.link.link()))
            // group
            assert.strictEqual(invCap.nb?.group, group)

            // Create effect for receipt with self signed queued operation
            const fx = await AggregatorCaps.pieceAccept
              .invoke({
                issuer: context.id,
                audience: context.id,
                with: context.id.did(),
                nb: {
                  ...invCap.nb,
                },
              })
              .delegate()

            return Server.ok(pieceOfferResponse).join(fx.link())
          },
        }),
      },
    })

    // invoke piece offer from storefront
    const res = await pieceOffer(
      {
        issuer: storefront,
        with: storefront.did(),
        audience: aggregatorService,
      },
      cargo.link.link(),
      group,
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.ok)
    assert.ok(res.out.ok.piece.equals(pieceOfferResponse.piece))
    // includes effect fx in receipt
    assert.ok(res.fx.join)
  })

  it('aggregator accepts a filecoin piece', async () => {
    const { pieces, aggregate } = await randomAggregate(100, 100)
    const group = 'did:web:free.web3.storage'

    /** @type {import('@web3-storage/capabilities/types').PieceAcceptSuccess} */
    const pieceAcceptResponse = {
      piece: pieces[0].link,
      aggregate: aggregate.link,
      inclusion: {
        subtree: {
          path: [],
          index: 0n,
        },
        index: {
          path: [],
          index: 0n,
        },
      }
    }

    // Create Ucanto service
    const service = mockService({
      piece: {
        accept: Server.provideAdvanced({
          capability: AggregatorCaps.pieceAccept,
          handler: async ({ invocation }) => {
            assert.strictEqual(invocation.issuer.did(), aggregatorService.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, AggregatorCaps.pieceAccept.can)
            assert.equal(invCap.with, invocation.issuer.did())
            // piece link
            assert.ok(invCap.nb?.piece.equals(pieces[0].link))
            // group
            assert.strictEqual(invCap.nb?.group, group)

            return Server.ok(pieceAcceptResponse)
          },
        }),
      },
    })

    // self invoke piece/offer from aggregator
    const res = await pieceAccept(
      {
        issuer: aggregatorService,
        with: aggregatorService.did(),
        audience: aggregatorService,
      },
      pieces[0].link,
      group,
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.ok)
    assert.ok(res.out.ok.piece.equals(pieceAcceptResponse.piece))
    assert.ok(res.out.ok.aggregate.equals(pieceAcceptResponse.aggregate))
    assert.deepEqual(res.out.ok.inclusion, pieceAcceptResponse.inclusion)
    // does not include effect fx in receipt
    assert.ok(!res.fx.join)
  })
})

async function getContext() {
  const storefront = await Signer.generate()

  return { storefront }
}

/**
 * @param {import('../src/types').AggregatorService} service
 */
function getConnection(service) {
  const server = Server.create({
    id: aggregatorService,
    service,
    codec: CAR.inbound,
  })
  const connection = Client.connect({
    id: aggregatorService,
    codec: CAR.outbound,
    channel: server,
  })

  return { connection }
}

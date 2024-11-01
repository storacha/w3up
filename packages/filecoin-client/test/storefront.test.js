import assert from 'assert'
import * as Signer from '@ucanto/principal/ed25519'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as StorefrontCaps from '@storacha/capabilities/filecoin/storefront'
import * as dagJSON from '@ipld/dag-json'
import {
  filecoinOffer,
  filecoinSubmit,
  filecoinAccept,
  filecoinInfo,
} from '../src/storefront.js'
import { randomAggregate, randomCargo } from './helpers/random.js'
import { mockService } from './helpers/mocks.js'
import { serviceProvider as storefrontService } from './fixtures.js'
import { validateAuthorization } from './helpers/utils.js'

describe('storefront', () => {
  it('agent offers a filecoin piece', async () => {
    const { agent } = await getContext()
    const [cargo] = await randomCargo(1, 100)

    /** @type {import('@storacha/capabilities/types').FilecoinOfferSuccess} */
    const filecoinOfferResponse = {
      piece: cargo.link,
    }

    // Create Ucanto service
    const service = mockService({
      filecoin: {
        offer: Server.provideAdvanced({
          capability: StorefrontCaps.filecoinOffer,
          handler: async ({ invocation, context }) => {
            assert.strictEqual(invocation.issuer.did(), agent.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, StorefrontCaps.filecoinOffer.can)
            assert.equal(invCap.with, invocation.issuer.did())
            assert.ok(invCap.nb)
            // piece link
            assert.ok(invCap.nb.piece.equals(cargo.link.link()))
            // content
            assert.ok(invCap.nb.content.equals(cargo.content.link()))

            // Create effect for receipt with self signed queued operation
            const submitfx = await StorefrontCaps.filecoinSubmit
              .invoke({
                issuer: context.id,
                audience: context.id,
                with: context.id.did(),
                nb: invCap.nb,
                expiration: Infinity,
              })
              .delegate()

            const acceptfx = await StorefrontCaps.filecoinAccept
              .invoke({
                issuer: context.id,
                audience: context.id,
                with: context.id.did(),
                nb: invCap.nb,
                expiration: Infinity,
              })
              .delegate()

            return Server.ok(filecoinOfferResponse)
              .fork(submitfx.link())
              .join(acceptfx.link())
          },
        }),
      },
    })

    const res = await filecoinOffer(
      {
        issuer: agent,
        with: agent.did(),
        audience: storefrontService,
      },
      cargo.content,
      cargo.link,
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.ok)
    assert.ok(res.out.ok.piece.equals(filecoinOfferResponse.piece))
    // includes effect fx in receipt
    assert.equal(res.fx.fork.length, 1)
    assert.ok(res.fx.join)
  })

  it('storefront submits a filecoin piece', async () => {
    const [cargo] = await randomCargo(1, 100)

    /** @type {import('@storacha/capabilities/types').FilecoinSubmitSuccess} */
    const filecoinSubmitResponse = {
      piece: cargo.link,
    }

    // Create Ucanto service
    const service = mockService({
      filecoin: {
        submit: Server.provideAdvanced({
          capability: StorefrontCaps.filecoinSubmit,
          handler: async ({ invocation, capability }) => {
            assert.equal(invocation.issuer.did(), storefrontService.did())
            assert.equal(invocation.capabilities.length, 1)
            assert.equal(capability.can, StorefrontCaps.filecoinSubmit.can)
            assert.equal(capability.with, invocation.issuer.did())
            assert(capability.nb)
            assert(capability.nb.piece.equals(cargo.link))
            assert(capability.nb.content.equals(cargo.content))
            return Server.ok(filecoinSubmitResponse)
          },
        }),
      },
    })

    // self invoke filecoin/add from storefront
    const res = await filecoinSubmit(
      {
        issuer: storefrontService,
        with: storefrontService.did(),
        audience: storefrontService,
      },
      cargo.content,
      cargo.link,
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.ok)
    assert(res.out.ok.piece.equals(filecoinSubmitResponse.piece))
    assert(!res.fx.join) // although IRL this would have a fx.join to piece/offer
  })

  it('storefront accepts a filecoin piece', async () => {
    const { pieces, aggregate } = await randomAggregate(100, 100)
    const cargo = pieces[0]

    // compute proof for piece in aggregate
    const proof = aggregate.resolveProof(cargo.link)
    if (proof.error) {
      throw new Error('could not compute proof')
    }

    /** @type {import('@storacha/capabilities/types').FilecoinAcceptSuccess} */
    const filecoinAcceptResponse = {
      aggregate: aggregate.link,
      piece: cargo.link,
      inclusion: {
        subtree: proof.ok[0],
        index: proof.ok[1],
      },
      aux: {
        dataType: 0n,
        dataSource: {
          dealID: 1138n,
        },
      },
    }

    // Create Ucanto service
    const service = mockService({
      filecoin: {
        accept: Server.provideAdvanced({
          capability: StorefrontCaps.filecoinAccept,
          handler: async ({ invocation, context }) => {
            assert.strictEqual(invocation.issuer.did(), storefrontService.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, StorefrontCaps.filecoinAccept.can)
            assert.equal(invCap.with, invocation.issuer.did())
            assert.ok(invCap.nb)
            // piece link
            assert.ok(invCap.nb.piece.equals(cargo.link.link()))
            // content
            assert.ok(invCap.nb.content.equals(cargo.content.link()))

            return Server.ok(filecoinAcceptResponse)
          },
        }),
      },
    })

    // self invoke filecoin/add from storefront
    const res = await filecoinAccept(
      {
        issuer: storefrontService,
        with: storefrontService.did(),
        audience: storefrontService,
      },
      cargo.content,
      cargo.link,
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.ok)
    assert.ok(res.out.ok.aggregate.equals(aggregate.link))
    assert.ok(res.out.ok.piece.equals(cargo.link))
    assert.equal(
      BigInt(res.out.ok.aux.dataSource.dealID),
      BigInt(filecoinAcceptResponse.aux.dataSource.dealID)
    )
    assert.deepEqual(res.out.ok.inclusion, filecoinAcceptResponse.inclusion)
    // does not include effect fx in receipt
    assert.ok(!res.fx.join)
  })

  it('storefront rejects a filecoin piece', async () => {
    const [cargo] = await randomCargo(1, 100)

    /** @type {import('@storacha/capabilities/types').FilecoinAcceptFailure} */
    const filecoinAcceptResponse = {
      name: 'InvalidContentPiece',
      message: 'Piece is a bad one.',
      content: cargo.link,
    }

    // Create Ucanto service
    const service = mockService({
      filecoin: {
        accept: Server.provideAdvanced({
          capability: StorefrontCaps.filecoinAccept,
          handler: async ({ invocation }) => {
            assert.strictEqual(invocation.issuer.did(), storefrontService.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, StorefrontCaps.filecoinAccept.can)
            assert.equal(invCap.with, invocation.issuer.did())
            assert.ok(invCap.nb)
            // piece link
            assert.ok(invCap.nb.piece.equals(cargo.link.link()))
            // content
            assert.ok(invCap.nb.content.equals(cargo.content.link()))

            return {
              error: filecoinAcceptResponse,
            }
          },
        }),
      },
    })

    // self invoke filecoin/add from storefront
    const res = await filecoinAccept(
      {
        issuer: storefrontService,
        with: storefrontService.did(),
        audience: storefrontService,
      },
      cargo.content,
      cargo.link,
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.error)
    assert.equal(
      dagJSON.stringify(res.out.error),
      dagJSON.stringify(filecoinAcceptResponse)
    )
    // does not include effect fx in receipt
    assert.ok(!res.fx.join)
  })

  it('agent asks info of a filecoin piece', async () => {
    const { agent } = await getContext()
    const [cargo] = await randomCargo(1, 100)

    /** @type {import('@storacha/capabilities/types').FilecoinOfferSuccess} */
    const filecoinOfferResponse = {
      piece: cargo.link,
    }

    // Create Ucanto service
    const service = mockService({
      filecoin: {
        info: Server.provideAdvanced({
          capability: StorefrontCaps.filecoinInfo,
          handler: async ({ invocation }) => {
            assert.strictEqual(invocation.issuer.did(), agent.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, StorefrontCaps.filecoinInfo.can)
            assert.equal(invCap.with, invocation.issuer.did())
            assert.ok(invCap.nb)
            const { piece } = invCap.nb
            // piece link
            assert.ok(piece.equals(cargo.link.link()))

            return Server.ok({
              piece,
              aggregates: [],
              deals: [],
            })
          },
        }),
      },
    })

    const res = await filecoinInfo(
      {
        issuer: agent,
        with: agent.did(),
        audience: storefrontService,
      },
      cargo.link,
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.ok)
    assert.ok(res.out.ok.piece.equals(filecoinOfferResponse.piece))
    assert.deepEqual(res.out.ok.deals, [])
  })
})

async function getContext() {
  const agent = await Signer.generate()

  return { agent }
}

/**
 * @param {import('../src/types.js').StorefrontService} service
 */
function getConnection(service) {
  const server = Server.create({
    id: storefrontService,
    service,
    codec: CAR.inbound,
    validateAuthorization,
  })
  const connection = Client.connect({
    id: storefrontService,
    codec: CAR.outbound,
    channel: server,
  })

  return { connection }
}

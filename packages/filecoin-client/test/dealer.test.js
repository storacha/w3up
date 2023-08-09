import assert from 'assert'
import * as Signer from '@ucanto/principal/ed25519'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import { CBOR } from '@ucanto/core'
import { Filecoin as FilecoinCapabilities } from '@web3-storage/capabilities'

import { dealAdd } from '../src/dealer.js'

import { randomAggregate } from './helpers/random.js'
import { mockService } from './helpers/mocks.js'
import { OperationFailed, OperationErrorName } from './helpers/errors.js'
import { serviceProvider as dealerService } from './fixtures.js'

describe('dealer.add', () => {
  it('aggregator adds an aggregate piece to the dealer, getting the piece queued', async () => {
    const { aggregator, storefront: storefrontSigner } = await getContext()

    // generate aggregate to add
    const { pieces, aggregate } = await randomAggregate(100, 100)
    const offer = pieces.map((p) => p.link)
    const piecesBlock = await CBOR.write(offer)
    const storefront = storefrontSigner.did()
    const label = 'label'
    /** @type {import('@web3-storage/capabilities/types').DealAddSuccess} */
    const dealAddResponse = {
      aggregate: aggregate.link,
    }

    // Create Ucanto service
    const service = mockService({
      deal: {
        add: Server.provideAdvanced({
          capability: FilecoinCapabilities.dealAdd,
          handler: async ({ invocation, context }) => {
            assert.strictEqual(invocation.issuer.did(), aggregator.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, FilecoinCapabilities.dealAdd.can)
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
            const fx = await FilecoinCapabilities.dealAdd
              .invoke({
                issuer: context.id,
                audience: context.id,
                with: context.id.did(),
                nb: invCap.nb,
              })
              .delegate()

            return Server.ok(dealAddResponse).join(fx.link())
          },
        }),
      },
    })

    // invoke piece add from storefront
    const res = await dealAdd(
      {
        issuer: aggregator,
        with: aggregator.did(),
        audience: dealerService,
      },
      aggregate.link.link(),
      offer,
      storefront,
      label,
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.ok)
    assert.ok(res.out.ok.aggregate?.equals(dealAddResponse.aggregate))
    // includes effect fx in receipt
    assert.ok(res.fx.join)
  })

  it('dealer self invokes add an aggregate piece to accept the piece queued', async () => {
    const { storefront: storefrontSigner } = await getContext()

    // generate aggregate to add
    const { pieces, aggregate } = await randomAggregate(100, 100)
    const offer = pieces.map((p) => p.link)
    const piecesBlock = await CBOR.write(offer)
    const storefront = storefrontSigner.did()
    const label = 'label'

    /** @type {import('@web3-storage/capabilities/types').DealAddSuccess} */
    const dealAddResponse = {
      aggregate: aggregate.link,
    }

    // Create Ucanto service
    const service = mockService({
      deal: {
        add: Server.provideAdvanced({
          capability: FilecoinCapabilities.dealAdd,
          handler: async ({ invocation }) => {
            assert.strictEqual(invocation.issuer.did(), dealerService.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, FilecoinCapabilities.dealAdd.can)
            assert.equal(invCap.with, invocation.issuer.did())
            assert.ok(invCap.nb)

            // piece link
            assert.ok(invCap.nb.aggregate.equals(aggregate.link.link()))

            // Validate block inline exists
            const invocationBlocks = Array.from(invocation.iterateIPLDBlocks())
            assert.ok(
              invocationBlocks.find((b) => b.cid.equals(piecesBlock.cid))
            )

            return Server.ok(dealAddResponse)
          },
        }),
      },
    })

    // invoke piece add from storefront
    const res = await dealAdd(
      {
        issuer: dealerService,
        with: dealerService.did(),
        audience: dealerService,
      },
      aggregate.link.link(),
      offer,
      storefront,
      label,
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.ok)
    assert.ok(res.out.ok.aggregate?.equals(dealAddResponse.aggregate))
    // does not include effect fx in receipt
    assert.ok(!res.fx.join)
  })

  it('dealer self invokes add an aggregate piece to reject the piece queued', async () => {
    const { storefront: storefrontSigner } = await getContext()

    // generate aggregate to add
    const { pieces, aggregate } = await randomAggregate(100, 100)
    const offer = pieces.map((p) => p.link)
    const piecesBlock = await CBOR.write(offer)
    const storefront = storefrontSigner.did()
    const label = 'label'

    /** @type {import('@web3-storage/capabilities/types').DealAddFailure} */
    const dealAddResponse = new OperationFailed(
      'failed to add to aggregate',
      aggregate.link
    )

    // Create Ucanto service
    const service = mockService({
      deal: {
        add: Server.provideAdvanced({
          capability: FilecoinCapabilities.dealAdd,
          handler: async ({ invocation, context }) => {
            assert.strictEqual(invocation.issuer.did(), dealerService.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, FilecoinCapabilities.dealAdd.can)
            assert.equal(invCap.with, invocation.issuer.did())
            assert.ok(invCap.nb)

            // piece link
            assert.ok(invCap.nb.aggregate.equals(aggregate.link.link()))

            // Validate block inline exists
            const invocationBlocks = Array.from(invocation.iterateIPLDBlocks())
            assert.ok(
              invocationBlocks.find((b) => b.cid.equals(piecesBlock.cid))
            )

            return {
              error: dealAddResponse,
            }
          },
        }),
      },
    })

    // invoke piece add from storefront
    const res = await dealAdd(
      {
        issuer: dealerService,
        with: dealerService.did(),
        audience: dealerService,
      },
      aggregate.link.link(),
      offer,
      storefront,
      label,
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.error)
    assert.deepEqual(res.out.error.name, OperationErrorName)
    // does not include effect fx in receipt
    assert.ok(!res.fx.join)
  })
})

async function getContext() {
  const aggregator = await Signer.generate()
  const storefront = await Signer.generate()

  return { aggregator, storefront }
}

/**
 * @param {import('../src/types.js').DealerService} service
 */
function getConnection(service) {
  const server = Server.create({
    id: dealerService,
    service,
    codec: CAR.inbound,
  })
  const connection = Client.connect({
    id: dealerService,
    codec: CAR.outbound,
    channel: server,
  })

  return { connection }
}

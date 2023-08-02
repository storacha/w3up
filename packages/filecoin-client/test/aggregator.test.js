import assert from 'assert'
import * as Signer from '@ucanto/principal/ed25519'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import { Filecoin as FilecoinCapabilities } from '@web3-storage/capabilities'

import { pieceAdd } from '../src/aggregator.js'

import { randomCargo } from './helpers/random.js'
import { mockService } from './helpers/mocks.js'
import { OperationFailed, OperationErrorName } from './helpers/errors.js'
import { serviceProvider as aggregatorService } from './fixtures.js'

describe('piece.add', () => {
  it('storefront adds a filecoin piece to aggregator, getting the piece queued', async () => {
    const { storefront } = await getContext()

    // Generate cargo to add
    const [cargo] = await randomCargo(1, 100)
    const group = 'group'

    /** @type {import('@web3-storage/capabilities/types').PieceAddSuccess} */
    const pieceAddResponse = {
      status: 'queued',
      piece: cargo.link,
    }

    // Create Ucanto service
    const service = mockService({
      piece: {
        add: Server.provideAdvanced({
          capability: FilecoinCapabilities.pieceAdd,
          // @ts-expect-error not failure type expected because of assert throw
          handler: async ({ invocation, context }) => {
            assert.strictEqual(invocation.issuer.did(), storefront.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, FilecoinCapabilities.pieceAdd.can)
            assert.equal(invCap.with, invocation.issuer.did())
            // piece link
            assert.ok(invCap.nb?.piece.equals(cargo.link.link()))
            // group
            assert.strictEqual(invCap.nb?.group, group)

            // Create effect for receipt with self signed queued operation
            const fx = await FilecoinCapabilities.pieceAdd
              .invoke({
                issuer: context.id,
                audience: context.id,
                with: context.id.did(),
                nb: invCap.nb,
              })
              .delegate()

            return Server.ok(pieceAddResponse).join(fx.link())
          },
        }),
      },
    })

    // invoke piece add from storefront
    const res = await pieceAdd(
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
    assert.deepEqual(res.out.ok, pieceAddResponse)
    // includes effect fx in receipt
    assert.ok(res.fx.join)
  })

  it('aggregator self invokes add a filecoin piece to accept the piece queued', async () => {
    // Generate cargo to add
    const [cargo] = await randomCargo(1, 100)
    const group = 'group'

    /** @type {import('@web3-storage/capabilities/types').PieceAddSuccess} */
    const pieceAddResponse = {
      status: 'accepted',
      piece: cargo.link,
    }

    // Create Ucanto service
    const service = mockService({
      piece: {
        add: Server.provideAdvanced({
          capability: FilecoinCapabilities.pieceAdd,
          handler: async ({ invocation }) => {
            assert.strictEqual(invocation.issuer.did(), aggregatorService.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, FilecoinCapabilities.pieceAdd.can)
            assert.equal(invCap.with, invocation.issuer.did())
            // piece link
            assert.ok(invCap.nb?.piece.equals(cargo.link.link()))
            // group
            assert.strictEqual(invCap.nb?.group, group)

            return Server.ok(pieceAddResponse)
          },
        }),
      },
    })

    // self invoke piece/add from aggregator
    const res = await pieceAdd(
      {
        issuer: aggregatorService,
        with: aggregatorService.did(),
        audience: aggregatorService,
      },
      cargo.link.link(),
      group,
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.ok)
    assert.deepEqual(res.out.ok, pieceAddResponse)
    // does not include effect fx in receipt
    assert.ok(!res.fx.join)
  })

  it('aggregator self invokes add a filecoin piece to reject the piece queued', async () => {
    // Generate cargo to add
    const [cargo] = await randomCargo(1, 100)
    const group = 'group'

    /** @type {import('@web3-storage/capabilities/types').PieceAddFailure} */
    const pieceAddResponse = new OperationFailed(
      'failed to add to aggregate',
      cargo.link
    )

    // Create Ucanto service
    const service = mockService({
      piece: {
        add: Server.provideAdvanced({
          capability: FilecoinCapabilities.pieceAdd,
          handler: async ({ invocation }) => {
            assert.strictEqual(invocation.issuer.did(), aggregatorService.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, FilecoinCapabilities.pieceAdd.can)
            assert.equal(invCap.with, invocation.issuer.did())
            // piece link
            assert.ok(invCap.nb?.piece.equals(cargo.link.link()))
            // group
            assert.strictEqual(invCap.nb?.group, group)

            return {
              error: pieceAddResponse,
            }
          },
        }),
      },
    })

    // self invoke piece add from aggregator
    const res = await pieceAdd(
      {
        issuer: aggregatorService,
        with: aggregatorService.did(),
        audience: aggregatorService,
      },
      cargo.link.link(),
      group,
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.error)
    // @ts-expect-error no name inferred
    assert.deepEqual(res.out.error.name, OperationErrorName)
    // does not include effect fx in receipt
    assert.ok(!res.fx.join)
  })
})

async function getContext() {
  const storefront = await Signer.generate()

  return { storefront }
}

/**
 * @param {Partial<
 * import('../src/types').AggregatorService
 * >} service
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

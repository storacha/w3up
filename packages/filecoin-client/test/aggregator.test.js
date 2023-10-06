import assert from 'assert'
import * as Signer from '@ucanto/principal/ed25519'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import { Filecoin as FilecoinCapabilities } from '@web3-storage/capabilities'

import { aggregateQueue, aggregateAdd } from '../src/aggregator.js'

import { randomCargo } from './helpers/random.js'
import { mockService } from './helpers/mocks.js'
import { OperationFailed, OperationErrorName } from './helpers/errors.js'
import { validateAuthorization } from './helpers/utils.js'
import { serviceProvider as aggregatorService } from './fixtures.js'

describe('aggregate/add', () => {
  it('storefront queues a filecoin piece for aggregator to handle', async () => {
    const { storefront } = await getContext()

    // Generate cargo to add
    const [cargo] = await randomCargo(1, 100)
    const group = 'did:web:free.web3.storage'

    /** @type {import('@web3-storage/capabilities/types').AggregateAddSuccess} */
    const pieceAddResponse = {
      piece: cargo.link,
    }

    // Create Ucanto service
    const service = mockService({
      aggregate: {
        queue: Server.provideAdvanced({
          capability: FilecoinCapabilities.aggregateQueue,
          handler: async ({ invocation, context }) => {
            assert.strictEqual(invocation.issuer.did(), storefront.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(
              invCap.can,
              FilecoinCapabilities.aggregateQueue.can
            )
            assert.equal(invCap.with, invocation.issuer.did())
            // piece link
            assert.ok(invCap.nb?.piece.equals(cargo.link.link()))
            // group
            assert.strictEqual(invCap.nb?.group, group)

            // Create effect for receipt with self signed queued operation
            const fx = await FilecoinCapabilities.aggregateAdd
              .invoke({
                issuer: context.id,
                audience: context.id,
                with: context.id.did(),
                nb: {
                  ...invCap.nb,
                  // add storefront
                  storefront: invCap.with,
                },
              })
              .delegate()

            return Server.ok(pieceAddResponse).join(fx.link())
          },
        }),
        add: () => {
          throw new Error('not implemented')
        },
      },
    })

    // invoke piece add from storefront
    const res = await aggregateQueue(
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
    assert.ok(res.out.ok.piece.equals(pieceAddResponse.piece))
    // includes effect fx in receipt
    assert.ok(res.fx.join)
  })

  it('aggregator self invokes add a filecoin piece to accept the piece queued', async () => {
    const { storefront } = await getContext()

    // Generate cargo to add
    const [cargo] = await randomCargo(1, 100)
    const storefrontId = storefront.did()
    const group = 'did:web:free.web3.storage'

    /** @type {import('@web3-storage/capabilities/types').AggregateAddSuccess} */
    const pieceAddResponse = {
      piece: cargo.link,
    }

    // Create Ucanto service
    const service = mockService({
      aggregate: {
        add: Server.provideAdvanced({
          capability: FilecoinCapabilities.aggregateAdd,
          handler: async ({ invocation }) => {
            assert.strictEqual(invocation.issuer.did(), aggregatorService.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(
              invCap.can,
              FilecoinCapabilities.aggregateAdd.can
            )
            assert.equal(invCap.with, invocation.issuer.did())
            // piece link
            assert.ok(invCap.nb?.piece.equals(cargo.link.link()))
            // group
            assert.strictEqual(invCap.nb?.group, group)

            return Server.ok(pieceAddResponse)
          },
        }),
        queue: () => {
          throw new Error('not implemented')
        },
      },
    })

    // self invoke piece/add from aggregator
    const res = await aggregateAdd(
      {
        issuer: aggregatorService,
        with: aggregatorService.did(),
        audience: aggregatorService,
      },
      cargo.link.link(),
      storefrontId,
      group,
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.ok)
    assert.ok(res.out.ok.piece.equals(pieceAddResponse.piece))
    // does not include effect fx in receipt
    assert.ok(!res.fx.join)
  })

  it('aggregator self invokes add a filecoin piece to reject the piece queued', async () => {
    const { storefront } = await getContext()

    // Generate cargo to add
    const [cargo] = await randomCargo(1, 100)
    const storefrontId = storefront.did()
    const group = 'did:web:free.web3.storage'

    /** @type {import('@web3-storage/capabilities/types').AggregateAddFailure} */
    const pieceAddResponse = new OperationFailed(
      'failed to add to aggregate',
      cargo.link
    )

    // Create Ucanto service
    const service = mockService({
      aggregate: {
        add: Server.provideAdvanced({
          capability: FilecoinCapabilities.aggregateAdd,
          handler: async ({ invocation }) => {
            assert.strictEqual(invocation.issuer.did(), aggregatorService.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(
              invCap.can,
              FilecoinCapabilities.aggregateAdd.can
            )
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
        queue: () => {
          throw new Error('not implemented')
        },
      },
    })

    // self invoke piece add from aggregator
    const res = await aggregateAdd(
      {
        issuer: aggregatorService,
        with: aggregatorService.did(),
        audience: aggregatorService,
      },
      cargo.link.link(),
      storefrontId,
      group,
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.error)
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
 * @param {import('../src/types').AggregatorService} service
 */
function getConnection(service) {
  const server = Server.create({
    id: aggregatorService,
    service,
    codec: CAR.inbound,
    validateAuthorization,
  })
  const connection = Client.connect({
    id: aggregatorService,
    codec: CAR.outbound,
    channel: server,
  })

  return { connection }
}

import assert from 'assert'
import * as Signer from '@ucanto/principal/ed25519'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import { CBOR } from '@ucanto/core'
import { Filecoin as FilecoinCapabilities } from '@web3-storage/capabilities'

import { aggregateAdd } from '../src/broker.js'

import { randomAggregate } from './helpers/random.js'
import { mockService } from './helpers/mocks.js'
import { OperationFailed, OperationErrorName } from './helpers/errors.js'
import { serviceProvider as brokerService } from './fixtures.js'

describe('aggregate.add', () => {
  it('aggregator adds an aggregate piece to the broker, getting the piece queued', async () => {
    const { aggregator } = await getContext()

    // generate aggregate to add
    const { pieces, aggregate } = await randomAggregate(100, 100)
    const offer = pieces.map((p) => p.link)
    const offerBlock = await CBOR.write(offer)
    const dealConfig = {
      tenantId: 'web3.storage',
    }
    /** @type {import('@web3-storage/capabilities/types').AggregateAddSuccess} */
    const aggregateAddResponse = {
      status: 'queued',
    }

    // Create Ucanto service
    const service = mockService({
      aggregate: {
        add: Server.provideAdvanced({
          capability: FilecoinCapabilities.aggregateAdd,
          handler: async ({ invocation, context }) => {
            assert.strictEqual(invocation.issuer.did(), aggregator.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(
              invCap.can,
              FilecoinCapabilities.aggregateAdd.can
            )
            assert.equal(invCap.with, invocation.issuer.did())
            assert.ok(invCap.nb)

            // piece link
            assert.ok(invCap.nb.piece.equals(aggregate.link.link()))

            // Validate block inline exists
            const invocationBlocks = Array.from(invocation.iterateIPLDBlocks())
            assert.ok(
              invocationBlocks.find((b) => b.cid.equals(offerBlock.cid))
            )

            // Create effect for receipt with self signed queued operation
            const fx = await FilecoinCapabilities.aggregateAdd
              .invoke({
                issuer: context.id,
                audience: context.id,
                with: context.id.did(),
                nb: invCap.nb,
              })
              .delegate()

            return Server.ok(aggregateAddResponse).join(fx.link())
          },
        }),
      },
    })

    // invoke piece add from storefront
    const res = await aggregateAdd(
      {
        issuer: aggregator,
        with: aggregator.did(),
        audience: brokerService,
      },
      aggregate.link.link(),
      offer,
      dealConfig,
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.ok)
    assert.deepEqual(res.out.ok, aggregateAddResponse)
    // includes effect fx in receipt
    assert.ok(res.fx.join)
  })

  it('broker self invokes add an aggregate piece to accept the piece queued', async () => {
    // generate aggregate to add
    const { pieces, aggregate } = await randomAggregate(100, 100)
    const offer = pieces.map((p) => p.link)
    const offerBlock = await CBOR.write(offer)
    const dealConfig = {
      tenantId: 'web3.storage',
    }
    /** @type {import('@web3-storage/capabilities/types').AggregateAddSuccess} */
    const aggregateAddResponse = {
      status: 'accepted',
    }

    // Create Ucanto service
    const service = mockService({
      aggregate: {
        add: Server.provideAdvanced({
          capability: FilecoinCapabilities.aggregateAdd,
          handler: async ({ invocation, context }) => {
            assert.strictEqual(invocation.issuer.did(), brokerService.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(
              invCap.can,
              FilecoinCapabilities.aggregateAdd.can
            )
            assert.equal(invCap.with, invocation.issuer.did())
            assert.ok(invCap.nb)

            // piece link
            assert.ok(invCap.nb.piece.equals(aggregate.link.link()))

            // Validate block inline exists
            const invocationBlocks = Array.from(invocation.iterateIPLDBlocks())
            assert.ok(
              invocationBlocks.find((b) => b.cid.equals(offerBlock.cid))
            )

            return Server.ok(aggregateAddResponse)
          },
        }),
      },
    })

    // invoke piece add from storefront
    const res = await aggregateAdd(
      {
        issuer: brokerService,
        with: brokerService.did(),
        audience: brokerService,
      },
      aggregate.link.link(),
      offer,
      dealConfig,
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.ok)
    assert.deepEqual(res.out.ok, aggregateAddResponse)
    // does not include effect fx in receipt
    assert.ok(!res.fx.join)
  })

  it('broker self invokes add an aggregate piece to reject the piece queued', async () => {
    // generate aggregate to add
    const { pieces, aggregate } = await randomAggregate(100, 100)
    const offer = pieces.map((p) => p.link)
    const offerBlock = await CBOR.write(offer)
    const dealConfig = {
      tenantId: 'web3.storage',
    }
    /** @type {import('@web3-storage/capabilities/types').AggregateAddFailure} */
    const aggregateAddResponse = new OperationFailed(
      'failed to add to aggregate',
      aggregate.link
    )

    // Create Ucanto service
    const service = mockService({
      aggregate: {
        add: Server.provideAdvanced({
          capability: FilecoinCapabilities.aggregateAdd,
          handler: async ({ invocation, context }) => {
            assert.strictEqual(invocation.issuer.did(), brokerService.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(
              invCap.can,
              FilecoinCapabilities.aggregateAdd.can
            )
            assert.equal(invCap.with, invocation.issuer.did())
            assert.ok(invCap.nb)

            // piece link
            assert.ok(invCap.nb.piece.equals(aggregate.link.link()))

            // Validate block inline exists
            const invocationBlocks = Array.from(invocation.iterateIPLDBlocks())
            assert.ok(
              invocationBlocks.find((b) => b.cid.equals(offerBlock.cid))
            )

            return {
              error: aggregateAddResponse,
            }
          },
        }),
      },
    })

    // invoke piece add from storefront
    const res = await aggregateAdd(
      {
        issuer: brokerService,
        with: brokerService.did(),
        audience: brokerService,
      },
      aggregate.link.link(),
      offer,
      dealConfig,
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
  const aggregator = await Signer.generate()

  return { aggregator }
}

/**
 * @param {Partial<
 *import('../src/types').BrokerService
 * >} service
 */
function getConnection(service) {
  const server = Server.create({
    id: brokerService,
    service,
    codec: CAR.inbound,
  })
  const connection = Client.connect({
    id: brokerService,
    codec: CAR.outbound,
    channel: server,
  })

  return { connection }
}

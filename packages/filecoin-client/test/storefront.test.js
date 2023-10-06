import assert from 'assert'
import * as Signer from '@ucanto/principal/ed25519'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import { Filecoin as FilecoinCapabilities } from '@web3-storage/capabilities'

import { filecoinQueue, filecoinAdd } from '../src/storefront.js'

import { randomCargo } from './helpers/random.js'
import { mockService } from './helpers/mocks.js'
import { OperationFailed, OperationErrorName } from './helpers/errors.js'
import { serviceProvider as storefrontService } from './fixtures.js'
import { validateAuthorization } from './helpers/utils.js'

describe('filecoin/add', () => {
  it('agent queues a filecoin piece for storefront to handle', async () => {
    const { agent } = await getContext()

    // Generate cargo to add
    const [cargo] = await randomCargo(1, 100)

    /** @type {import('@web3-storage/capabilities/types').FilecoinAddSuccess} */
    const filecoinAddResponse = {
      piece: cargo.link,
    }

    // Create Ucanto service
    const service = mockService({
      filecoin: {
        queue: Server.provideAdvanced({
          capability: FilecoinCapabilities.filecoinQueue,
          handler: async ({ invocation, context }) => {
            assert.strictEqual(invocation.issuer.did(), agent.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(
              invCap.can,
              FilecoinCapabilities.filecoinQueue.can
            )
            assert.equal(invCap.with, invocation.issuer.did())
            assert.ok(invCap.nb)
            // piece link
            assert.ok(invCap.nb.piece.equals(cargo.link.link()))
            // content
            assert.ok(invCap.nb.content.equals(cargo.content.link()))

            // Create effect for receipt with self signed queued operation
            const fx = await FilecoinCapabilities.filecoinAdd
              .invoke({
                issuer: context.id,
                audience: context.id,
                with: context.id.did(),
                nb: invCap.nb,
              })
              .delegate()

            return Server.ok(filecoinAddResponse).join(fx.link())
          },
        }),
        add: () => {
          throw new Error('not implemented')
        },
      },
    })

    const res = await filecoinQueue(
      {
        issuer: agent,
        with: agent.did(),
        audience: storefrontService,
      },
      cargo.link.link(),
      cargo.content.link(),
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.ok)
    assert.ok(res.out.ok.piece.equals(filecoinAddResponse.piece))
    // includes effect fx in receipt
    assert.ok(res.fx.join)
  })

  it('storefront self invokes add a filecoin piece to accept the piece queued', async () => {
    // Generate cargo to add
    const [cargo] = await randomCargo(1, 100)

    /** @type {import('@web3-storage/capabilities/types').FilecoinAddSuccess} */
    const filecoinAddResponse = {
      piece: cargo.link,
    }

    // Create Ucanto service
    const service = mockService({
      filecoin: {
        add: Server.provideAdvanced({
          capability: FilecoinCapabilities.filecoinAdd,
          handler: async ({ invocation, context }) => {
            assert.strictEqual(invocation.issuer.did(), storefrontService.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, FilecoinCapabilities.filecoinAdd.can)
            assert.equal(invCap.with, invocation.issuer.did())
            assert.ok(invCap.nb)
            // piece link
            assert.ok(invCap.nb.piece.equals(cargo.link.link()))
            // content
            assert.ok(invCap.nb.content.equals(cargo.content.link()))

            return Server.ok(filecoinAddResponse)
          },
        }),
        queue: () => {
          throw new Error('not implemented')
        },
      },
    })

    // self invoke filecoin/add from storefront
    const res = await filecoinAdd(
      {
        issuer: storefrontService,
        with: storefrontService.did(),
        audience: storefrontService,
      },
      cargo.link.link(),
      cargo.content.link(),
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.ok)
    assert.ok(res.out.ok.piece.equals(filecoinAddResponse.piece))
    // does not include effect fx in receipt
    assert.ok(!res.fx.join)
  })

  it('storefront self invokes add a filecoin piece to reject the piece queued', async () => {
    // Generate cargo to add
    const [cargo] = await randomCargo(1, 100)

    /** @type {import('@web3-storage/capabilities/types').FilecoinAddFailure} */
    const filecoinAddResponse = new OperationFailed(
      'failed to verify piece',
      cargo.link
    )

    // Create Ucanto service
    const service = mockService({
      filecoin: {
        add: Server.provideAdvanced({
          capability: FilecoinCapabilities.filecoinAdd,
          handler: async ({ invocation, context }) => {
            assert.strictEqual(invocation.issuer.did(), storefrontService.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, FilecoinCapabilities.filecoinAdd.can)
            assert.equal(invCap.with, invocation.issuer.did())
            assert.ok(invCap.nb)
            // piece link
            assert.ok(invCap.nb.piece.equals(cargo.link.link()))
            // content
            assert.ok(invCap.nb.content.equals(cargo.content.link()))

            return {
              error: filecoinAddResponse,
            }
          },
        }),
        queue: () => {
          throw new Error('not implemented')
        },
      },
    })

    // self invoke filecoin/add from storefront
    const res = await filecoinAdd(
      {
        issuer: storefrontService,
        with: storefrontService.did(),
        audience: storefrontService,
      },
      cargo.link.link(),
      cargo.content.link(),
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.error)
    assert.deepEqual(res.out.error.name, OperationErrorName)
    // does not include effect fx in receipt
    assert.ok(!res.fx.join)
  })
})

async function getContext() {
  const agent = await Signer.generate()

  return { agent }
}

/**
 * @param {import('../src/types').StorefrontService} service
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

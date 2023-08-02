import assert from 'assert'
import * as Signer from '@ucanto/principal/ed25519'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import { Filecoin as FilecoinCapabilities } from '@web3-storage/capabilities'

import { chainInfo } from '../src/chain.js'

import { randomCargo } from './helpers/random.js'
import { mockService } from './helpers/mocks.js'
import { serviceProvider as chainService } from './fixtures.js'

describe('chain.info', () => {
  it('storefront gets info of a filecoin piece from chain', async () => {
    const { storefront } = await getContext()

    // Generate cargo to get info
    const [cargo] = await randomCargo(1, 100)

    /** @type {import('@web3-storage/capabilities/types').ChainInfoSuccess} */
    const chainInfoResponse = {
      status: 'queued',
      piece: cargo.link,
    }

    // Create Ucanto service
    const service = mockService({
      chain: {
        info: Server.provideAdvanced({
          capability: FilecoinCapabilities.chainInfo,
          handler: async ({ invocation, context }) => {
            assert.strictEqual(invocation.issuer.did(), storefront.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, FilecoinCapabilities.chainInfo.can)
            assert.equal(invCap.with, invocation.issuer.did())

            // piece link
            assert.ok(invCap.nb?.piece.equals(cargo.link.link()))

            return Server.ok(chainInfoResponse)
          },
        }),
      },
    })

    // invoke piece add from storefront
    const res = await chainInfo(
      {
        issuer: storefront,
        with: storefront.did(),
        audience: chainService,
      },
      cargo.link.link(),
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.ok)
    assert.deepEqual(res.out.ok, chainInfoResponse)
  })
})

async function getContext() {
  const storefront = await Signer.generate()

  return { storefront }
}

/**
 * @param {Partial<
 * import('../src/types').ChainService
 * >} service
 */
function getConnection(service) {
  const server = Server.create({
    id: chainService,
    service,
    codec: CAR.inbound,
  })
  const connection = Client.connect({
    id: chainService,
    codec: CAR.outbound,
    channel: server,
  })

  return { connection }
}

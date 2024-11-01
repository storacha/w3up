import assert from 'assert'
import * as Signer from '@ucanto/principal/ed25519'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as DealTrackerCaps from '@storacha/capabilities/filecoin/deal-tracker'
import { dealInfo } from '../src/deal-tracker.js'
import { randomCargo } from './helpers/random.js'
import { mockService } from './helpers/mocks.js'
import { validateAuthorization } from './helpers/utils.js'
import { serviceProvider as chainService } from './fixtures.js'

describe('deal tracker', () => {
  it('storefront gets deal information', async () => {
    const { storefront } = await getContext()

    // Generate cargo to get info
    const [cargo] = await randomCargo(1, 100)

    /** @type {import('@storacha/capabilities/types').DealInfoSuccess} */
    const dealInfoResponse = {
      deals: {
        12_345: {
          provider: 'f099',
        },
      },
    }

    // Create Ucanto service
    const service = mockService({
      deal: {
        info: Server.provideAdvanced({
          capability: DealTrackerCaps.dealInfo,
          handler: async ({ invocation, context }) => {
            assert.strictEqual(invocation.issuer.did(), storefront.did())
            assert.strictEqual(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.strictEqual(invCap.can, DealTrackerCaps.dealInfo.can)
            assert.equal(invCap.with, invocation.issuer.did())
            // piece link
            assert.ok(invCap.nb?.piece.equals(cargo.link))
            return Server.ok(dealInfoResponse)
          },
        }),
      },
    })

    // invoke piece add from storefront
    const res = await dealInfo(
      {
        issuer: storefront,
        with: storefront.did(),
        audience: chainService,
      },
      cargo.link.link(),
      { connection: getConnection(service).connection }
    )

    assert.ok(res.out.ok)
    assert.deepEqual(res.out.ok, dealInfoResponse)
  })
})

async function getContext() {
  const storefront = await Signer.generate()

  return { storefront }
}

/**
 * @param {import('../src/types.js').DealTrackerService} service
 */
function getConnection(service) {
  const server = Server.create({
    id: chainService,
    service,
    codec: CAR.inbound,
    validateAuthorization,
  })
  const connection = Client.connect({
    id: chainService,
    codec: CAR.outbound,
    channel: server,
  })

  return { connection }
}

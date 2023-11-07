import assert from 'assert'
import { create as createServer, provide } from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as Signer from '@ucanto/principal/ed25519'
import * as AccessCapabilities from '@web3-storage/capabilities/access'
import { mockService, mockServiceConf } from '../helpers/mocks.js'
import { Client, AgentData } from '../../src/client.js'
import { validateAuthorization } from '../helpers/utils.js'

describe('AccessClient', () => {
  describe('claim', () => {
    it('should claim delegations', async () => {
      const service = mockService({
        access: {
          claim: provide(AccessCapabilities.claim, ({ invocation }) => {
            assert.equal(invocation.issuer.did(), alice.agent.did())
            assert.equal(invocation.capabilities.length, 1)
            const invCap = invocation.capabilities[0]
            assert.equal(invCap.can, AccessCapabilities.claim.can)
            return {
              ok: {
                delegations: {},
              },
            }
          }),
        },
      })

      const server = createServer({
        id: await Signer.generate(),
        service,
        codec: CAR.inbound,
        validateAuthorization,
      })

      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: await mockServiceConf(server),
      })

      const delegations = await alice.capability.access.claim()

      assert(service.access.claim.called)
      assert.equal(service.access.claim.callCount, 1)
      assert.deepEqual(delegations, [])
    })
  })
})

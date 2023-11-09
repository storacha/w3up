import assert from 'assert'
import { create as createServer, provide } from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as Signer from '@ucanto/principal/ed25519'
import { Absentee } from '@ucanto/principal'
import * as SubscriptionCapabilities from '@web3-storage/capabilities/subscription'
import { AgentData } from '@web3-storage/access/agent'
import { mockService, mockServiceConf } from '../helpers/mocks.js'
import { Client } from '../../src/client.js'
import { createAuthorization, validateAuthorization } from '../helpers/utils.js'

describe('SubscriptionClient', () => {
  describe('list', () => {
    it('should list subscriptions', async () => {
      const space = await Signer.generate()
      /** @type {import('@web3-storage/capabilities/types').SubscriptionListItem} */
      const subscription = {
        provider: 'did:web:web3.storage',
        subscription: 'test',
        consumers: [space.did()]
      }
      const account = Absentee.from({ id: 'did:mailto:example.com:alice' })
      const service = mockService({
        subscription: {
          list: provide(SubscriptionCapabilities.list, ({ capability }) => {
            assert.equal(capability.with, account.did())
            return {
              ok: {
                results: [subscription],
              },
            }
          }),
        },
      })

      const serviceSigner = await Signer.generate()
      const server = createServer({
        id: serviceSigner,
        service,
        codec: CAR.inbound,
        validateAuthorization,
      })

      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: await mockServiceConf(server),
      })

      const auths = await createAuthorization({
        account,
        service: serviceSigner,
        agent: alice.agent.issuer
      })
      await alice.agent.addProofs(auths)

      const subs = await alice.capability.subscription.list(account.did())

      assert(service.subscription.list.called)
      assert.equal(service.subscription.list.callCount, 1)
      assert.deepEqual(subs, { results: [subscription] })
    })

    it('should throw on service failure', async () => {
      const account = Absentee.from({ id: 'did:mailto:example.com:alice' })
      const service = mockService({
        subscription: {
          list: provide(SubscriptionCapabilities.list, ({ capability }) => {
            assert.equal(capability.with, account.did())
            return { error: new Error('boom') }
          }),
        },
      })

      const serviceSigner = await Signer.generate()
      const server = createServer({
        id: serviceSigner,
        service,
        codec: CAR.inbound,
        validateAuthorization,
      })

      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: await mockServiceConf(server),
      })

      const auths = await createAuthorization({
        account,
        service: serviceSigner,
        agent: alice.agent.issuer
      })
      await alice.agent.addProofs(auths)

      await assert.rejects(
        alice.capability.subscription.list(account.did()),
        { message: 'failed subscription/list invocation' }
      )

      assert(service.subscription.list.called)
      assert.equal(service.subscription.list.callCount, 1)
    })
  })
})

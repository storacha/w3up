import assert from 'assert'
import { create as createServer, provide, ok } from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as Signer from '@ucanto/principal/ed25519'

import { Plan as PlanCapabilities } from '@web3-storage/capabilities'
import { AgentData } from '@web3-storage/access/agent'

import { mockService, mockServiceConf } from '../helpers/mocks.js'
import { Client } from '../../src/client.js'
import { createAuthorization, validateAuthorization } from '../helpers/utils.js'
import { Absentee } from '@ucanto/principal'

/**
 * @type {import('@ipld/dag-ucan').DID}
 */
const exampleProduct = 'did:web:example.com'
const aliceDID = 'did:mailto:example.com:alice'

describe('PlanClient', () => {
  describe('get', () => {
    it('should get a plan', async () => {
      const account = Absentee.from({ id: aliceDID })
      let error = false
      const service = mockService({
        plan: {
          get: provide(PlanCapabilities.get, ({ invocation }) => {
            if (!error) {
              return ok({
                product: exampleProduct,
                updatedAt: Date.now().toString(),
              })
            } else {
              return { error: { name: 'PlanNotFound', message: '' } }
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
        agent: alice.agent.issuer,
      })
      await alice.agent.addProofs(auths)
      const res = await alice.capability.plan.get(account.did())

      assert(service.plan.get.called)
      assert.equal(service.plan.get.callCount, 1)
      assert.equal(res.product, exampleProduct)
      assert(res.updatedAt)

      error = true
      await assert.rejects(alice.capability.plan.get(account.did()))
    })
  })

  describe('set', () => {
    it('should set a plan', async () => {
      const account = Absentee.from({ id: aliceDID })
      let error = false
      const service = mockService({
        plan: {
          set: provide(PlanCapabilities.set, ({ invocation }) => {
            if (!error) {
              assert(invocation.capabilities[0].nb)
              assert.equal(
                invocation.capabilities[0].nb.product,
                exampleProduct
              )
              return ok({})
            } else {
              return { error: { name: 'CustomerNotFound', message: '' } }
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
        agent: alice.agent.issuer,
      })
      await alice.agent.addProofs(auths)
      const res = await alice.capability.plan.set(account.did(), exampleProduct)

      assert(service.plan.set.called)
      assert.equal(service.plan.set.callCount, 1)
      assert(res)

      error = true
      await assert.rejects(
        alice.capability.plan.set(account.did(), exampleProduct)
      )
    })
  })

  describe('createAdminSession', () => {
    it('should create an admin session', async () => {
      const account = Absentee.from({ id: 'did:mailto:example.com:alice' })
      let error = false
      const service = mockService({
        plan: {
          'create-admin-session': provide(
            PlanCapabilities.createAdminSession,
            ({ invocation }) => {
              if (!error) {
                return ok({ url: 'https://example.com/authorize/user' })
              } else {
                return { error: { name: 'CustomerNotFound', message: '' } }
              }
            }
          ),
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
        agent: alice.agent.issuer,
      })
      await alice.agent.addProofs(auths)

      const res = await alice.capability.plan.createAdminSession(
        account.did(),
        'https://example.com/return-url'
      )
      assert(service.plan['create-admin-session'].called)
      assert.equal(service.plan['create-admin-session'].callCount, 1)
      assert(res)

      error = true
      await assert.rejects(
        alice.capability.plan.createAdminSession(
          account.did(),
          'https://example.com/return-url'
        )
      )
    })
  })
})

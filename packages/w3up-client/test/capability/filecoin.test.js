import assert from 'assert'
import {
  create as createServer,
  provide,
  provideAdvanced,
  ok,
} from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as Signer from '@ucanto/principal/ed25519'
import { Filecoin as FilecoinCapabilities } from '@web3-storage/capabilities'
import { AgentData } from '@web3-storage/access/agent'

import { randomAggregate, randomCargo } from '../helpers/random.js'
import { mockService, mockServiceConf } from '../helpers/mocks.js'
import { Client } from '../../src/client.js'
import { validateAuthorization } from '../helpers/utils.js'

describe('FilecoinClient', () => {
  describe('offer', () => {
    it('should send an offer', async () => {
      const service = mockService({
        filecoin: {
          offer: provideAdvanced({
            capability: FilecoinCapabilities.offer,
            handler: async ({ invocation, context }) => {
              const invCap = invocation.capabilities[0]
              assert.ok(invCap.nb)

              // Create effect for receipt with self signed queued operation
              const submitfx = await FilecoinCapabilities.submit
                .invoke({
                  issuer: context.id,
                  audience: context.id,
                  with: context.id.did(),
                  nb: invCap.nb,
                  expiration: Infinity,
                })
                .delegate()

              const acceptfx = await FilecoinCapabilities.accept
                .invoke({
                  issuer: context.id,
                  audience: context.id,
                  with: context.id.did(),
                  nb: invCap.nb,
                  expiration: Infinity,
                })
                .delegate()

              return ok({
                piece: invCap.nb.piece,
              })
                .fork(submitfx.link())
                .join(acceptfx.link())
            },
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

      const space = await alice.createSpace('test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      const [cargo] = await randomCargo(1, 100)
      const res = await alice.capability.filecoin.offer(
        cargo.content,
        cargo.link
      )

      assert(service.filecoin.offer.called)
      assert.equal(service.filecoin.offer.callCount, 1)
      assert(res.out.ok)
      assert(res.out.ok.piece.equals(cargo.link))
      assert(res.fx.join)
      assert(res.fx.fork.length)
    })
  })
  describe('info', () => {
    it('should get piece info', async () => {
      const { pieces, aggregate } = await randomAggregate(10, 100)
      const cargo = pieces[0]
      // compute proof for piece in aggregate
      const proof = aggregate.resolveProof(cargo.link)
      if (proof.error) {
        throw new Error('could not compute proof')
      }
      /** @type {import('@web3-storage/capabilities/types').FilecoinInfoSuccess} */
      const filecoinAcceptResponse = {
        piece: cargo.link,
        aggregates: [
          {
            aggregate: aggregate.link,
            inclusion: {
              subtree: proof.ok[0],
              index: proof.ok[1],
            },
          },
        ],
        deals: [
          {
            aggregate: aggregate.link,
            provider: 'f1111',
            aux: {
              dataType: 0n,
              dataSource: {
                dealID: 1138n,
              },
            },
          },
        ],
      }
      const service = mockService({
        filecoin: {
          info: provide(FilecoinCapabilities.info, ({ invocation }) => {
            const invCap = invocation.capabilities[0]
            assert.ok(invCap.nb)

            return ok(filecoinAcceptResponse)
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

      const space = await alice.createSpace('test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      const res = await alice.capability.filecoin.info(cargo.link)

      assert(service.filecoin.info.called)
      assert.equal(service.filecoin.info.callCount, 1)
      assert(res.out.ok)
      assert(res.out.ok.piece.equals(cargo.link))
      assert.equal(res.out.ok.deals.length, 1)
      assert(res.out.ok.deals[0].aggregate.equals(aggregate.link))
      assert(res.out.ok.deals[0].aux.dataSource.dealID)
      assert(res.out.ok.deals[0].provider)
      assert.deepEqual(res.out.ok.aggregates[0].inclusion, {
        subtree: proof.ok[0],
        index: proof.ok[1],
      })
    })
  })
})

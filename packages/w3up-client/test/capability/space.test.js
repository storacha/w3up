import { AgentData } from '@web3-storage/access/agent'
import { Client } from '../../src/client.js'
import * as Test from '../test.js'
import { Space } from '@web3-storage/capabilities'
import { freewaySigner } from '../../../upload-api/test/helpers/utils.js'
import { randomCAR } from '../helpers/random.js'

export const SpaceClient = Test.withContext({
  info: {
    'should retrieve space info': async (
      assert,
      { connection, provisionsStorage }
    ) => {
      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
      })

      const space = await alice.createSpace('test')
      const auth = await space.createAuthorization(alice, {
        access: { 'space/info': {} },
        expiration: Infinity,
      })
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())
      // Then we setup a billing for this account
      await provisionsStorage.put({
        // @ts-expect-error
        provider: connection.id.did(),
        account: alice.agent.did(),
        consumer: space.did(),
      })

      const info = await alice.capability.space.info(space.did())

      assert.equal(info.did, space.did())
      assert.deepEqual(info.providers, [connection.id.did()])
    },
  },
  record: {
    'should record egress': async (
      assert,
      { id: w3, connection, provisionsStorage }
    ) => {
      const expiration = Date.now() + 1000 * 60 * 60 * 24 // 1 day from now

      // 1. Setup test space and allow Alice Agent to access it
      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
      })
      const space = await alice.createSpace('test')
      const auth = await alice.addSpace(await space.createAuthorization(alice))
      assert.ok(auth)

      await alice.setCurrentSpace(space.did())
      await provisionsStorage.put({
        // @ts-expect-error
        provider: w3.did(),
        account: alice.did(),
        consumer: space.did(),
      })

      // 2. Allow Alice Agent to record egress
      const recordEgressAuth = await space.createAuthorization(alice, {
        access: { [Space.recordEgress.can]: {} },
        expiration: expiration,
      })
      await alice.addProof(recordEgressAuth)
      const proofs = await alice.proofs()
      assert.ok(proofs.length >= 2)

      // 3. Creates a new agent using freewaySigner as the principal
      const freewayService = new Client(
        await AgentData.create({
          principal: freewaySigner,
        }),
        {
          // @ts-ignore
          serviceConf: {
            access: connection,
            upload: connection,
          },
        }
      )

      // 4. Alice delegates to the Gateway the ability to record egress
      const recordEgressGatewayDelegation = await Space.recordEgress.delegate({
        issuer: alice.agent.issuer,
        audience: freewayService,
        with: space.did(),
        expiration: expiration,
      })

      const resultDelegation2 = await alice.capability.access.delegate({
        delegations: [recordEgressGatewayDelegation],
      })
      assert.ok(resultDelegation2.ok)

      // 5. freewayService claims the delegation
      const freewayDelegations = await freewayService.capability.access.claim()
      assert.ok(freewayDelegations.length > 0)
      assert.ok(
        freewayDelegations.some(
          (d) =>
            d.audience.did() === recordEgressGatewayDelegation.audience.did() &&
            d.issuer.did() === recordEgressGatewayDelegation.issuer.did() &&
            d.capabilities.some((c) => c.can === Space.recordEgress.can)
        )
      )

      // 6. Create a random resource to record egress
      const car = await randomCAR(128)
      const resource = await alice.capability.store.add(car)
      assert.ok(resource)

      // 7. freewayService invokes egress/record
      try {
        const log = await freewayService.capability.space.recordEgress(
          {
            space: space.did(),
            resource: resource.link(),
            bytes: car.size,
            servedAt: new Date().toISOString(),
          },
          { proofs: [recordEgressGatewayDelegation] }
        )

        assert.deepEqual(log, {})
      } catch (error) {
        // @ts-ignore
        assert.fail(error.cause.message || error)
      }
    },
    // 'should fail to record egress if the capability was not delegated': async (
    //   assert,
    //   { id: w3, connection, provisionsStorage }
    // ) => {
    //   // Creates a new agent using w3Signer as the principal
    //   const w3Service = new Client(
    //     await AgentData.create({
    //       // @ts-ignore
    //       principal: w3,
    //     }),
    //     {
    //       // @ts-ignore
    //       serviceConf: {
    //         access: connection,
    //         upload: connection,
    //       },
    //     }
    //   )

    //   const space = await w3Service.createSpace('test')
    //   const auth = await space.createAuthorization(w3Service)
    //   await w3Service.addSpace(auth)
    //   await w3Service.setCurrentSpace(space.did())

    //   // Then we setup a billing for this account
    //   await provisionsStorage.put({
    //     // @ts-expect-error
    //     provider: connection.id.did(),
    //     account: w3Service.agent.did(),
    //     consumer: space.did(),
    //   })

    //   // Creates a new agent using freewaySigner as the principal
    //   const freewayService = new Client(
    //     await AgentData.create({
    //       principal: freewaySigner,
    //     }),
    //     {
    //       // @ts-ignore
    //       serviceConf: {
    //         access: connection,
    //         upload: connection,
    //       },
    //     }
    //   )

    //   // Random resource to record egress
    //   const car = await randomCAR(128)
    //   const resource = car.cid

    //   // w3Service creates a delegation to a random service
    //   const recordEgress = await Space.record.delegate({
    //     issuer: w3Service.agent.issuer,
    //     audience: await ed25519.Signer.generate(),
    //     // @ts-ignore
    //     with: w3.did(),
    //     expiration: Infinity,
    //   })

    //   // FreewayService attempts to invoke egress/record without performing the delegation
    //   try {
    //     await freewayService.capability.space.record(
    //       {
    //         space: space.did(),
    //         resource: resource.link(),
    //         bytes: car.size,
    //         servedAt: new Date().toISOString(),
    //       },
    //       { proofs: [recordEgress] }
    //     )
    //     assert.fail('Expected an error due to missing delegation')
    //   } catch (error) {
    //     assert.ok(
    //       // @ts-ignore
    //       error.cause.message.startsWith(
    //         'Claim {"can":"usage/record"} is not authorized\n  - Capability {"can":"usage/record","with":"did:web:test.web3.storage",'
    //       ),
    //       'Error was thrown as expected'
    //     )
    //   }
    // },
  },
})

Test.test({ SpaceClient })

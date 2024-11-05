import { AgentData } from '@web3-storage/access/agent'
import { Client } from '../../src/client.js'
import * as Test from '../test.js'
import { Space } from '@web3-storage/capabilities'
import { gatewaySigner } from '../../../upload-api/test/helpers/utils.js'
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
    'should record egress if the capability is derived from *': async (
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

      // 2. Creates a new agent using freewaySigner as the principal
      const freewayService = new Client(
        await AgentData.create({
          principal: gatewaySigner,
        }),
        {
          // @ts-ignore
          serviceConf: {
            access: connection,
            upload: connection,
          },
        }
      )

      // 3. Alice delegates to the Gateway the ability to record egress
      const egressRecordGatewayDelegation = await Space.egressRecord.delegate({
        issuer: alice.agent.issuer,
        audience: freewayService,
        with: space.did(),
        expiration: expiration,
        proofs: await alice.proofs(),
      })

      const resultDelegation2 = await alice.capability.access.delegate({
        delegations: [egressRecordGatewayDelegation],
      })
      assert.ok(resultDelegation2.ok)

      // 4. freewayService claims the delegation
      const freewayDelegations = await freewayService.capability.access.claim()
      assert.ok(freewayDelegations.length > 0)
      assert.ok(
        freewayDelegations.some(
          (d) =>
            d.issuer.did() === alice.did() &&
            d.audience.did() === freewayService.did() &&
            d.capabilities.some(
              (c) => c.can === Space.egressRecord.can && c.with === space.did()
            )
        )
      )

      // 5. Create a random resource to record egress
      const car = await randomCAR(128)
      const resource = await alice.capability.store.add(car)
      assert.ok(resource)

      // 6. freewayService invokes egress/record
      try {
        const egressData = {
          space: space.did(),
          resource: resource.link(),
          bytes: car.size,
          servedAt: new Date().toISOString(),
        }
        const egressRecord = await freewayService.capability.space.egressRecord(
          egressData,
          {
            proofs: await freewayService.proofs(),
          }
        )
        assert.ok(egressRecord, 'egressRecord should be returned')
        assert.equal(
          egressRecord.space,
          space.did(),
          'space should be the same'
        )
        assert.equal(
          egressRecord.resource.toString(),
          resource.toString(),
          'resource should be the same'
        )
        assert.equal(egressRecord.bytes, car.size, 'bytes should be the same')
        assert.equal(
          new Date(egressRecord.servedAt).getTime(),
          Math.floor(new Date(egressData.servedAt).getTime() / 1000) * 1000,
          'servedAt should be the same'
        )
        assert.ok(egressRecord.cause.toString(), 'cause should be a link')
      } catch (error) {
        // @ts-ignore
        assert.fail(error.cause ? error.cause.message : error)
      }
    },
    'should record egress if the capability is derived from space/*': async (
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

      // 2. Creates a new agent using freewaySigner as the principal
      const freewayService = new Client(
        await AgentData.create({
          principal: gatewaySigner,
        }),
        {
          // @ts-ignore
          serviceConf: {
            access: connection,
            upload: connection,
          },
        }
      )

      // 3. Alice delegates to the Gateway the ability to record egress
      const spaceAccessGatewayDelegation = await Space.top.delegate({
        issuer: alice.agent.issuer,
        audience: freewayService,
        with: space.did(),
        expiration: expiration,
        proofs: await alice.proofs(),
      })

      const resultDelegation2 = await alice.capability.access.delegate({
        delegations: [spaceAccessGatewayDelegation],
      })
      assert.ok(resultDelegation2.ok)

      // 4. freewayService claims the delegation
      const freewayDelegations = await freewayService.capability.access.claim()
      assert.ok(freewayDelegations.length > 0)
      assert.ok(
        freewayDelegations.some(
          (d) =>
            d.issuer.did() === alice.did() &&
            d.audience.did() === freewayService.did() &&
            d.capabilities.some(
              (c) => c.can === Space.top.can && c.with === space.did()
            )
        )
      )

      // 5. Create a random resource to record egress
      const car = await randomCAR(128)
      const resource = await alice.capability.store.add(car)
      assert.ok(resource)

      // 6. freewayService invokes egress/record
      try {
        const egressData = {
          space: space.did(),
          resource: resource.link(),
          bytes: car.size,
          servedAt: new Date().toISOString(),
        }
        const egressRecord = await freewayService.capability.space.egressRecord(
          egressData,
          {
            proofs: await freewayService.proofs(),
          }
        )
        assert.ok(egressRecord, 'egressRecord should be returned')
        assert.equal(
          egressRecord.space,
          space.did(),
          'space should be the same'
        )
        assert.equal(
          egressRecord.resource.toString(),
          resource.toString(),
          'resource should be the same'
        )
        assert.equal(egressRecord.bytes, car.size, 'bytes should be the same')
        assert.equal(
          new Date(egressRecord.servedAt).getTime(),
          Math.floor(new Date(egressData.servedAt).getTime() / 1000) * 1000,
          'servedAt should be the same'
        )
        assert.ok(egressRecord.cause.toString(), 'cause should be a link')
      } catch (error) {
        // @ts-ignore
        assert.fail(error.cause ? error.cause.message : error)
      }
    },
    'should record egress if the capability is derived from space/content/serve/*':
      async (assert, { id: w3, connection, provisionsStorage }) => {
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
        const auth = await alice.addSpace(
          await space.createAuthorization(alice)
        )
        assert.ok(auth)

        await alice.setCurrentSpace(space.did())
        await provisionsStorage.put({
          // @ts-expect-error
          provider: w3.did(),
          account: alice.did(),
          consumer: space.did(),
        })

        // 2. Creates a new agent using freewaySigner as the principal
        const freewayService = new Client(
          await AgentData.create({
            principal: gatewaySigner,
          }),
          {
            // @ts-ignore
            serviceConf: {
              access: connection,
              upload: connection,
            },
          }
        )

        // 3. Alice delegates to the Gateway the ability to serve content
        const contentServeGatewayDelegation = await Space.contentServe.delegate(
          {
            issuer: alice.agent.issuer,
            audience: freewayService,
            with: space.did(),
            expiration: expiration,
            proofs: await alice.proofs(),
          }
        )

        const resultDelegation2 = await alice.capability.access.delegate({
          delegations: [contentServeGatewayDelegation],
        })
        assert.ok(resultDelegation2.ok)

        // 4. freewayService claims the delegation
        const freewayDelegations =
          await freewayService.capability.access.claim()
        assert.ok(freewayDelegations.length > 0)
        assert.ok(
          freewayDelegations.some(
            (d) =>
              d.issuer.did() === alice.did() &&
              d.audience.did() === freewayService.did() &&
              d.capabilities.some(
                (c) =>
                  c.can === Space.contentServe.can && c.with === space.did()
              )
          )
        )

        // 5. Create a random resource to record egress
        const car = await randomCAR(128)
        const resource = await alice.capability.store.add(car)
        assert.ok(resource)

        // 6. freewayService invokes egress/record
        try {
          const egressData = {
            space: space.did(),
            resource: resource.link(),
            bytes: car.size,
            servedAt: new Date().toISOString(),
          }
          const egressRecord =
            await freewayService.capability.space.egressRecord(egressData, {
              proofs: await freewayService.proofs(),
            })
          assert.ok(egressRecord, 'egressRecord should be returned')
          assert.equal(
            egressRecord.space,
            space.did(),
            'space should be the same'
          )
          assert.equal(
            egressRecord.resource.toString(),
            resource.toString(),
            'resource should be the same'
          )
          assert.equal(egressRecord.bytes, car.size, 'bytes should be the same')
          assert.equal(
            new Date(egressRecord.servedAt).getTime(),
            Math.floor(new Date(egressData.servedAt).getTime() / 1000) * 1000,
            'servedAt should be the same'
          )
          assert.ok(egressRecord.cause.toString(), 'cause should be a link')
        } catch (error) {
          // @ts-ignore
          assert.fail(error.cause ? error.cause.message : error)
        }
      },
    'should record egress if the capability space/content/serve/egress/record is delegated':
      async (assert, { id: w3, connection, provisionsStorage }) => {
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
        const auth = await alice.addSpace(
          await space.createAuthorization(alice)
        )
        assert.ok(auth)

        await alice.setCurrentSpace(space.did())
        await provisionsStorage.put({
          // @ts-expect-error
          provider: w3.did(),
          account: alice.did(),
          consumer: space.did(),
        })

        // 2. Creates a new agent using freewaySigner as the principal
        const freewayService = new Client(
          await AgentData.create({
            principal: gatewaySigner,
          }),
          {
            // @ts-ignore
            serviceConf: {
              access: connection,
              upload: connection,
            },
          }
        )

        // 3. Alice delegates to the Gateway the ability to record egress
        const egressRecordGatewayDelegation = await Space.egressRecord.delegate(
          {
            issuer: alice.agent.issuer,
            audience: freewayService,
            with: space.did(),
            expiration: expiration,
            proofs: await alice.proofs(),
          }
        )

        const resultDelegation2 = await alice.capability.access.delegate({
          delegations: [egressRecordGatewayDelegation],
        })
        assert.ok(resultDelegation2.ok)

        // 4. freewayService claims the delegation
        const freewayDelegations =
          await freewayService.capability.access.claim()
        assert.ok(freewayDelegations.length > 0)
        assert.ok(
          freewayDelegations.some(
            (d) =>
              d.issuer.did() === alice.did() &&
              d.audience.did() === freewayService.did() &&
              d.capabilities.some(
                (c) =>
                  c.can === Space.egressRecord.can && c.with === space.did()
              )
          )
        )

        // 5. Create a random resource to record egress
        const car = await randomCAR(128)
        const resource = await alice.capability.store.add(car)
        assert.ok(resource)

        // 6. freewayService invokes egress/record
        try {
          const egressData = {
            space: space.did(),
            resource: resource.link(),
            bytes: car.size,
            servedAt: new Date().toISOString(),
          }
          const egressRecord =
            await freewayService.capability.space.egressRecord(egressData, {
              proofs: await freewayService.proofs(),
            })
          assert.ok(egressRecord, 'egressRecord should be returned')
          assert.equal(
            egressRecord.space,
            space.did(),
            'space should be the same'
          )
          assert.equal(
            egressRecord.resource.toString(),
            resource.toString(),
            'resource should be the same'
          )
          assert.equal(egressRecord.bytes, car.size, 'bytes should be the same')
          assert.equal(
            new Date(egressRecord.servedAt).getTime(),
            Math.floor(new Date(egressData.servedAt).getTime() / 1000) * 1000,
            'servedAt should be the same'
          )
          assert.ok(egressRecord.cause.toString(), 'cause should be a link')
        } catch (error) {
          // @ts-ignore
          assert.fail(error.cause ? error.cause.message : error)
        }
      },
    'should fail to record egress if the capability was not delegated': async (
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

      // 2. Creates a new agent using freewaySigner as the principal
      const freewayService = new Client(
        await AgentData.create({
          principal: gatewaySigner,
        }),
        {
          // @ts-ignore
          serviceConf: {
            access: connection,
            upload: connection,
          },
        }
      )

      // 3. Alice delegates to the Gateway the ability to record egress but without proofs
      const egressRecordGatewayDelegation = await Space.egressRecord.delegate({
        issuer: alice.agent.issuer,
        audience: freewayService,
        with: space.did(),
        expiration: expiration,
        proofs: [], // No proofs to test the error
      })

      const resultDelegation2 = await alice.capability.access.delegate({
        delegations: [egressRecordGatewayDelegation],
      })
      assert.ok(resultDelegation2.ok)

      // 4. freewayService claims the delegation
      const freewayDelegations = await freewayService.capability.access.claim()
      assert.ok(freewayDelegations.length > 0)
      assert.ok(
        freewayDelegations.some(
          (d) =>
            d.issuer.did() === alice.did() &&
            d.audience.did() === freewayService.did() &&
            d.capabilities.some(
              (c) => c.can === Space.egressRecord.can && c.with === space.did()
            )
        )
      )

      // 5. Create a random resource to record egress
      const car = await randomCAR(128)

      // 6. FreewayService attempts to invoke egress/record without having the delegation
      try {
        await freewayService.capability.space.egressRecord(
          {
            space: space.did(),
            resource: car.cid.link(),
            bytes: car.size,
            servedAt: new Date().toISOString(),
          },
          { proofs: [] }
        )
        assert.fail('Expected an error due to missing delegation')
      } catch (error) {
        assert.equal(
          // @ts-ignore
          error.message,
          `failed ${Space.egressRecord.can} invocation`,
          'error message should be the same'
        )
      }
    },
  },
})

Test.test({ SpaceClient })

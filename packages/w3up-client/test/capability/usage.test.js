import { AgentData } from '@web3-storage/access/agent'
import { Client } from '../../src/client.js'
import * as Test from '../test.js'
import { receiptsEndpoint } from '../helpers/utils.js'
import { randomCAR } from '../helpers/random.js'
import {
  freeway,
  freewaySigner,
  mallory,
  w3,
  w3Signer,
} from '../../../upload-api/test/helpers/utils.js'
import {
  alice,
  gateway,
} from '@web3-storage/capabilities/test/helpers/fixtures'
import { Usage } from '@web3-storage/capabilities'
import { claim } from '../../src/capability/access.js'
import { Signer } from '@ucanto/principal/ed25519'

export const UsageClient = Test.withContext({
  report: {
    'should fetch usage report': async (
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
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)

      // Then we setup a billing for this account
      await provisionsStorage.put({
        // @ts-expect-error
        provider: connection.id.did(),
        account: alice.agent.did(),
        consumer: space.did(),
      })

      const content = new Blob(['hello world'])
      await alice.uploadFile(content, {
        receiptsEndpoint,
      })

      const period = { from: new Date(0), to: new Date() }

      const report = await alice.capability.usage.report(space.did(), period)

      const [[id, record]] = Object.entries(report)
      assert.equal(id, connection.id.did())

      assert.equal(record.provider, connection.id.did())
      assert.equal(record.space, space.did())
      assert.equal(record.period.from, period.from.toISOString())
      assert.ok(record.period.to > period.to.toISOString())
      assert.equal(record.size.initial, 0)
      assert.ok(record.size.final >= content.size)
      assert.ok(record.events.length > 0)
    },

    'should be empty on unknown space': async (assert, { connection }) => {
      const alice = new Client(await AgentData.create(), {
        // @ts-ignore
        serviceConf: {
          access: connection,
          upload: connection,
        },
      })

      const space = await alice.createSpace('test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)

      const period = { from: new Date(), to: new Date() }
      const report = await alice.capability.usage.report(space.did(), period)
      assert.deepEqual(report, {})
    },
  },
  record: {
    'should record egress': async (
      assert,
      { connection, provisionsStorage }
    ) => {
      // Creates a new agent using w3Signer as the principal
      const w3Service = new Client(
        await AgentData.create({
          principal: w3Signer,
        }),
        {
          // @ts-ignore
          serviceConf: {
            access: connection,
            upload: connection,
          },
        }
      )

      const space = await w3Service.createSpace('test')
      const auth = await space.createAuthorization(w3Service)
      await w3Service.addSpace(auth)

      // Then we setup a billing for this account
      await provisionsStorage.put({
        // @ts-expect-error
        provider: connection.id.did(),
        account: w3Service.agent.did(),
        consumer: space.did(),
      })

      // Creates a new agent using freewaySigner as the principal
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

      // Random resource to record egress
      const car = await randomCAR(128)
      const resource = car.cid

      // w3Service delegates ability to record usage to freewayService
      const recordEgress = await Usage.record.delegate({
        issuer: w3Service.agent.issuer,
        audience: freewayService,
        with: w3.did(),
        expiration: Infinity,
      })

      const delegationResult = await w3Service.capability.access.delegate({
        delegations: [recordEgress],
      })
      assert.ok(delegationResult.ok)

      // freewayService claims the delegation
      const delegations = await freewayService.capability.access.claim()
      assert.ok(delegations.length > 0)
      assert.ok(
        delegations.some(
          (d) =>
            d.audience.did() === recordEgress.audience.did() &&
            d.issuer.did() === recordEgress.issuer.did() &&
            d.capabilities.some((c) => c.can === Usage.record.can)
        )
      )

      // freewayService invokes usage/record and indicates the w3 as the provider
      const record = await freewayService.capability.usage.record(
        {
          space: space.did(),
          resource: resource.link(),
          bytes: car.size,
          servedAt: new Date().toISOString(),
        },
        w3.did(),
        { proofs: delegations }
      )

      assert.ok(record)
    },
  },
})

Test.test({ UsageClient })

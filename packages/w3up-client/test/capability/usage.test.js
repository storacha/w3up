import assert from 'assert'
import { create as createServer, provide } from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as Signer from '@ucanto/principal/ed25519'
import * as UsageCapabilities from '@web3-storage/capabilities/usage'
import { AgentData } from '@web3-storage/access/agent'
import { mockService, mockServiceConf } from '../helpers/mocks.js'
import { Client } from '../../src/client.js'
import { validateAuthorization } from '../helpers/utils.js'

describe('UsageClient', () => {
  describe('report', () => {
    it('should fetch usage report', async () => {
      const service = mockService({
        usage: {
          report: provide(UsageCapabilities.report, () => {
            return { ok: { [report.provider]: report } }
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

      const period = { from: new Date(0), to: new Date() }
      /** @type {import('@web3-storage/capabilities/types').UsageData} */
      const report = {
        provider: 'did:web:web3.storage',
        space: space.did(),
        size: { initial: 0, final: 0 },
        period: {
          from: period.from.toISOString(),
          to: period.to.toISOString()
        },
        events: []
      }

      const subs = await alice.capability.usage.report(space.did(), period)

      assert(service.usage.report.called)
      assert.equal(service.usage.report.callCount, 1)
      assert.deepEqual(subs, { [report.provider]: report })
    })

    it('should throw on service failure', async () => {
      const service = mockService({
        usage: {
          report: provide(UsageCapabilities.report, ({ capability }) => {
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

      const space = await alice.createSpace('test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)

      await assert.rejects(
        () => {
          const period = { from: new Date(), to: new Date() }
          return alice.capability.usage.report(space.did(), period)
        },
        { message: 'failed usage/report invocation' }
      )

      assert(service.usage.report.called)
      assert.equal(service.usage.report.callCount, 1)
    })
  })
})

import assert from 'assert'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as Signer from '@ucanto/principal/ed25519'
import * as IndexCapabilities from '@storacha/capabilities/index'
import * as Index from '../src/index/index.js'
import { serviceSigner } from './fixtures.js'
import { randomCAR } from './helpers/random.js'
import { mockService } from './helpers/mocks.js'
import { validateAuthorization } from './helpers/utils.js'

describe('Index.add', () => {
  it('Registers a DAG index with the service', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await IndexCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      space: {
        index: {
          add: Server.provideAdvanced({
            capability: IndexCapabilities.add,
            handler: async ({ capability }) => {
              assert.equal(capability.nb.index.toString(), car.cid.toString())
              return Server.ok({})
            },
          }),
        },
      },
    })

    const server = Server.create({
      id: serviceSigner,
      service,
      codec: CAR.inbound,
      validateAuthorization,
    })
    const connection = Client.connect({
      id: serviceSigner,
      codec: CAR.outbound,
      channel: server,
    })

    await Index.add(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      car.cid,
      { connection }
    )
  })

  it('throws on service error', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await IndexCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      space: {
        index: {
          add: Server.provideAdvanced({
            capability: IndexCapabilities.add,
            handler: async () => {
              throw new Server.Failure('boom')
            },
          }),
        },
      },
    })

    const server = Server.create({
      id: serviceSigner,
      service,
      codec: CAR.inbound,
      validateAuthorization,
    })
    const connection = Client.connect({
      id: serviceSigner,
      codec: CAR.outbound,
      channel: server,
    })

    await assert.rejects(
      Index.add(
        { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
        car.cid,
        { connection }
      ),
      { message: 'failed space/index/add invocation' }
    )
  })
})

import assert from 'assert'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Signer from '@ucanto/principal/ed25519'
import { add as uploadAdd } from '@web3-storage/access/capabilities/upload'
import { register } from '../src/upload.js'
import { service as id } from './fixtures.js'
import { randomCAR } from './helpers/random.js'

describe('Upload', () => {
  it('registers an upload with the service', async () => {
    const account = await Signer.generate()
    const issuer = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await uploadAdd.delegate({
        issuer: account,
        audience: id,
        with: account.did(),
        expiration: Infinity,
      }),
    ]

    const service = {
      store: {
        add: () => {
          throw new Server.Failure('not expected to be called')
        },
      },
      upload: {
        /** @param {Server.Invocation<import('../src/types').UploadAdd>} invocation */
        add: (invocation) => {
          assert.equal(invocation.issuer.did(), issuer.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, 'upload/add')
          assert.equal(invCap.with, account.did())
          assert.equal(String(invCap.nb.root), car.roots[0].toString())
          assert.equal(invCap.nb.shards?.length, 1)
          assert.equal(String(invCap.nb.shards?.[0]), car.cid.toString())
          return null
        },
      },
    }

    const server = Server.create({ id, service, decoder: CAR, encoder: CBOR })
    const connection = Client.connect({
      id,
      encoder: CAR,
      decoder: CBOR,
      channel: server,
    })

    await register({ issuer, proofs }, car.roots[0], [car.cid], {
      connection,
    })
  })
})

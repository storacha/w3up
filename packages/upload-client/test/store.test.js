import assert from 'assert'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Signer from '@ucanto/principal/ed25519'
import { add as storeAdd } from '@web3-storage/access/capabilities/store'
import * as Store from '../src/store.js'
import { service as id } from './fixtures.js'
import { randomCAR } from './helpers/random.js'
import { mockService } from './helpers/mocks.js'

describe('Storage', () => {
  it('stores a DAG with the service', async () => {
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9000',
    }

    const account = await Signer.generate()
    const issuer = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await storeAdd.delegate({
        issuer: account,
        audience: id,
        with: account.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({
      store: {
        /** @param {Server.Invocation<import('../src/types').StoreAdd>} invocation */
        add(invocation) {
          assert.equal(invocation.issuer.did(), issuer.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, 'store/add')
          assert.equal(invCap.with, account.did())
          assert.equal(String(invCap.nb.link), car.cid.toString())
          return res
        },
      },
    })

    const server = Server.create({ id, service, decoder: CAR, encoder: CBOR })
    const connection = Client.connect({
      id,
      encoder: CAR,
      decoder: CBOR,
      channel: server,
    })

    const carCID = await Store.add({ issuer, proofs }, car, { connection })
    assert(carCID)
    assert.equal(carCID.toString(), car.cid.toString())
  })

  it('skips sending CAR if status = done', async () => {
    const res = {
      status: 'done',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9001', // will fail the test if called
    }

    const account = await Signer.generate()
    const issuer = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await storeAdd.delegate({
        issuer: account,
        audience: id,
        with: account.did(),
        expiration: Infinity,
      }),
    ]

    const service = mockService({ store: { add: () => res } })

    const server = Server.create({ id, service, decoder: CAR, encoder: CBOR })
    const connection = Client.connect({
      id,
      encoder: CAR,
      decoder: CBOR,
      channel: server,
    })

    const carCID = await Store.add({ issuer, proofs }, car, { connection })
    assert(carCID)
    assert.equal(carCID.toString(), car.cid.toString())
  })

  it('aborts', async () => {
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9001', // will fail the test if called
    }

    const service = mockService({ store: { add: () => res } })

    const server = Server.create({ id, service, decoder: CAR, encoder: CBOR })
    const connection = Client.connect({
      id,
      encoder: CAR,
      decoder: CBOR,
      channel: server,
    })

    const account = await Signer.generate()
    const issuer = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await storeAdd.delegate({
        issuer: account,
        audience: id,
        with: account.did(),
        expiration: Infinity,
      }),
    ]

    const controller = new AbortController()
    controller.abort() // already aborted

    await assert.rejects(
      Store.add({ issuer, proofs }, car, {
        connection,
        signal: controller.signal,
      }),
      { name: 'Error', message: 'upload aborted' }
    )
  })
})

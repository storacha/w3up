import assert from 'assert'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Signer from '@ucanto/principal/ed25519'
import { add as storeAdd } from '@web3-storage/access/capabilities/store'
import { add as uploadAdd } from '@web3-storage/access/capabilities/upload'
import { registerUpload, store } from '../src/storage.js'
import { service as id } from './fixtures.js'
import { randomCAR } from './helpers/random.js'

describe('Storage', () => {
  it('stores a DAG with the service', async () => {
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9000',
    }

    const account = await Signer.generate()
    const signer = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await storeAdd.delegate({
        issuer: account,
        audience: id,
        with: account.did(),
        expiration: Infinity,
      }),
    ]

    const service = {
      store: {
        /** @param {Server.Invocation<import('../src/types').StoreAdd>} invocation */
        add(invocation) {
          assert.equal(invocation.issuer.did(), signer.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, 'store/add')
          assert.equal(invCap.with, account.did())
          assert.equal(String(invCap.nb.link), car.cid.toString())
          return res
        },
      },
      upload: {
        add: () => {
          throw new Server.Failure('not expected to be called')
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

    const carCID = await store(signer, proofs, car, { connection })
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
    const signer = await Signer.generate()
    const car = await randomCAR(128)

    const proofs = [
      await storeAdd.delegate({
        issuer: account,
        audience: id,
        with: account.did(),
        expiration: Infinity,
      }),
    ]

    const service = {
      store: { add: () => res },
      upload: {
        add: () => {
          throw new Server.Failure('not expected to be called')
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

    const carCID = await store(signer, proofs, car, { connection })
    assert(carCID)
    assert.equal(carCID.toString(), car.cid.toString())
  })

  it('aborts', async () => {
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9001', // will fail the test if called
    }

    const service = {
      store: { add: () => res },
      upload: {
        add: () => {
          throw new Server.Failure('not expected to be called')
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

    const account = await Signer.generate()
    const signer = await Signer.generate()
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
      store(signer, proofs, car, { connection, signal: controller.signal }),
      { name: 'Error', message: 'upload aborted' }
    )
  })

  it('registers an upload with the service', async () => {
    const account = await Signer.generate()
    const signer = await Signer.generate()
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
          assert.equal(invocation.issuer.did(), signer.did())
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

    await registerUpload(signer, proofs, car.roots[0], [car.cid], {
      connection,
    })
  })
})

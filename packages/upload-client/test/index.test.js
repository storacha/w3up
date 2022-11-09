import assert from 'assert'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Signer from '@ucanto/principal/ed25519'
import { uploadFile, uploadDirectory } from '../src/index.js'
import { service as id, alice } from './fixtures.js'
import { randomBytes } from './helpers/random.js'
import { File } from './helpers/shims.js'

describe('uploadFile', () => {
  it('uploads a file to the service', async () => {
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9000',
    }

    const account = alice.did()
    const signer = await Signer.generate()
    const file = new Blob([randomBytes(128)])
    /** @type {import('../src/types').CARLink|undefined} */
    let carCID

    const service = {
      store: {
        /** @param {Server.Invocation<import('../src/types').StoreAdd>} invocation */
        add(invocation) {
          assert.equal(invocation.issuer.did(), signer.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, 'store/add')
          assert.equal(invCap.with, account)
          return res
        },
      },
      upload: {
        /** @param {Server.Invocation<import('../src/types').UploadAdd>} invocation */
        add: (invocation) => {
          assert.equal(invocation.issuer.did(), signer.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, 'upload/add')
          assert.equal(invCap.with, account)
          assert.equal(invCap.nb.shards?.length, 1)
          assert.equal(String(invCap.nb.shards?.[0]), carCID?.toString())
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
    const dataCID = await uploadFile(account, signer, file, {
      connection,
      onStoredShard: (meta) => {
        carCID = meta.cid
      },
    })

    assert(carCID)
    assert(dataCID)
  })
})

describe('uploadDirectory', () => {
  it('uploads a directory to the service', async () => {
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9000',
    }

    const account = alice.did()
    const signer = await Signer.generate()
    const files = [
      new File([randomBytes(128)], '1.txt'),
      new File([randomBytes(32)], '2.txt'),
    ]
    /** @type {import('../src/types').CARLink?} */
    let carCID = null

    const service = {
      store: {
        /** @param {Server.Invocation<import('../src/types').StoreAdd>} invocation */
        add(invocation) {
          assert.equal(invocation.issuer.did(), signer.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, 'store/add')
          assert.equal(invCap.with, account)
          return res
        },
      },
      upload: {
        /** @param {Server.Invocation<import('../src/types').UploadAdd>} invocation */
        add: (invocation) => {
          assert.equal(invocation.issuer.did(), signer.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, 'upload/add')
          assert.equal(invCap.with, account)
          assert.equal(invCap.nb.shards?.length, 1)
          assert.equal(String(invCap.nb.shards?.[0]), carCID?.toString())
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
    const dataCID = await uploadDirectory(account, signer, files, {
      connection,
      onStoredShard: (meta) => {
        carCID = meta.cid
      },
    })

    assert(carCID)
    assert(dataCID)
  })
})

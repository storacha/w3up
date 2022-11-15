import assert from 'assert'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Signer from '@ucanto/principal/ed25519'
import { add as storeAdd } from '@web3-storage/access/capabilities/store'
import { add as uploadAdd } from '@web3-storage/access/capabilities/upload'
import { uploadFile, uploadDirectory } from '../src/index.js'
import { service as id } from './fixtures.js'
import { randomBytes } from './helpers/random.js'
import { File } from './helpers/shims.js'
import { mockService } from './helpers/mocks.js'

describe('uploadFile', () => {
  it('uploads a file to the service', async () => {
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9200',
    }

    const account = await Signer.generate()
    const issuer = await Signer.generate()
    const file = new Blob([await randomBytes(128)])
    /** @type {import('../src/types').CARLink|undefined} */
    let carCID

    const proofs = await Promise.all([
      storeAdd.delegate({
        issuer: account,
        audience: id,
        with: account.did(),
        expiration: Infinity,
      }),
      uploadAdd.delegate({
        issuer: account,
        audience: id,
        with: account.did(),
        expiration: Infinity,
      }),
    ])

    const service = mockService({
      store: {
        add(invocation) {
          assert.equal(invocation.issuer.did(), issuer.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, 'store/add')
          assert.equal(invCap.with, account.did())
          return res
        },
      },
      upload: {
        add: (invocation) => {
          assert.equal(invocation.issuer.did(), issuer.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, 'upload/add')
          assert.equal(invCap.with, account.did())
          assert.equal(invCap.nb.shards?.length, 1)
          assert.equal(String(invCap.nb.shards?.[0]), carCID?.toString())
          return null
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
    const dataCID = await uploadFile({ issuer, proofs }, file, {
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
      url: 'http://localhost:9200',
    }

    const account = await Signer.generate()
    const issuer = await Signer.generate()
    const files = [
      new File([await randomBytes(128)], '1.txt'),
      new File([await randomBytes(32)], '2.txt'),
    ]
    /** @type {import('../src/types').CARLink?} */
    let carCID = null

    const proofs = await Promise.all([
      storeAdd.delegate({
        issuer: account,
        audience: id,
        with: account.did(),
        expiration: Infinity,
      }),
      uploadAdd.delegate({
        issuer: account,
        audience: id,
        with: account.did(),
        expiration: Infinity,
      }),
    ])

    const service = mockService({
      store: {
        add(invocation) {
          assert.equal(invocation.issuer.did(), issuer.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, 'store/add')
          assert.equal(invCap.with, account.did())
          return res
        },
      },
      upload: {
        add: (invocation) => {
          assert.equal(invocation.issuer.did(), issuer.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, 'upload/add')
          assert.equal(invCap.with, account.did())
          assert.equal(invCap.nb.shards?.length, 1)
          assert.equal(String(invCap.nb.shards?.[0]), carCID?.toString())
          return null
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
    const dataCID = await uploadDirectory({ issuer, proofs }, files, {
      connection,
      onStoredShard: (meta) => {
        carCID = meta.cid
      },
    })

    assert(carCID)
    assert(dataCID)
  })
})

import assert from 'assert'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import { provide } from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Signer from '@ucanto/principal/ed25519'
import * as StoreCapabilities from '@web3-storage/access/capabilities/store'
import * as UploadCapabilities from '@web3-storage/access/capabilities/upload'
import { uploadFile, uploadDirectory } from '../src/index.js'
import { serviceSigner } from './fixtures.js'
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

    const space = await Signer.generate()
    const agent = await Signer.generate() // The "user" that will ask the service to accept the upload
    const file = new Blob([await randomBytes(128)])
    /** @type {import('../src/types').CARLink|undefined} */
    let carCID

    const proofs = await Promise.all([
      StoreCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
      UploadCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ])

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, ({ invocation }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, StoreCapabilities.add.can)
          assert.equal(invCap.with, space.did())
          return res
        }),
      },
      upload: {
        add: provide(UploadCapabilities.add, ({ invocation }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, UploadCapabilities.add.can)
          assert.equal(invCap.with, space.did())
          assert.equal(invCap.nb?.shards?.length, 1)
          assert.equal(String(invCap.nb?.shards?.[0]), carCID?.toString())
          return null
        }),
      },
    })

    const server = Server.create({
      id: serviceSigner,
      service,
      decoder: CAR,
      encoder: CBOR,
    })
    const connection = Client.connect({
      id: serviceSigner,
      encoder: CAR,
      decoder: CBOR,
      channel: server,
    })
    const dataCID = await uploadFile(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      file,
      {
        connection,
        onStoredShard: (meta) => {
          carCID = meta.cid
        },
      }
    )

    assert(service.store.add.called)
    assert.equal(service.store.add.callCount, 1)
    assert(service.upload.add.called)
    assert.equal(service.upload.add.callCount, 1)

    assert(carCID)
    assert(dataCID)
  })

  it('allows custom shard size to be set', async () => {
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9200',
    }

    const space = await Signer.generate()
    const agent = await Signer.generate() // The "user" that will ask the service to accept the upload
    const file = new Blob([await randomBytes(500_000)])
    /** @type {import('../src/types').CARLink[]} */
    const carCIDs = []

    const proofs = await Promise.all([
      StoreCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
      UploadCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ])

    const service = mockService({
      store: { add: () => res },
      upload: { add: () => null },
    })

    const server = Server.create({
      id: serviceSigner,
      service,
      decoder: CAR,
      encoder: CBOR,
    })
    const connection = Client.connect({
      id: serviceSigner,
      encoder: CAR,
      decoder: CBOR,
      channel: server,
    })
    await uploadFile(
      // @ts-expect-error https://github.com/web3-storage/w3protocol/pull/181
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      file,
      {
        connection,
        shardSize: 400_000, // should end up with 2 CAR files
        onStoredShard: (meta) => carCIDs.push(meta.cid),
      }
    )

    assert.equal(carCIDs.length, 2)
  })
})

describe('uploadDirectory', () => {
  it('uploads a directory to the service', async () => {
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9200',
    }

    const space = await Signer.generate()
    const agent = await Signer.generate()
    const files = [
      new File([await randomBytes(128)], '1.txt'),
      new File([await randomBytes(32)], '2.txt'),
    ]
    /** @type {import('../src/types').CARLink?} */
    let carCID = null

    const proofs = await Promise.all([
      StoreCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
      UploadCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ])

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, ({ invocation }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, StoreCapabilities.add.can)
          assert.equal(invCap.with, space.did())
          return res
        }),
      },
      upload: {
        add: provide(UploadCapabilities.add, ({ invocation }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, UploadCapabilities.add.can)
          assert.equal(invCap.with, space.did())
          assert.equal(invCap.nb?.shards?.length, 1)
          assert.equal(String(invCap.nb?.shards?.[0]), carCID?.toString())
          return null
        }),
      },
    })

    const server = Server.create({
      id: serviceSigner,
      service,
      decoder: CAR,
      encoder: CBOR,
    })
    const connection = Client.connect({
      id: serviceSigner,
      encoder: CAR,
      decoder: CBOR,
      channel: server,
    })
    const dataCID = await uploadDirectory(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      files,
      {
        connection,
        onStoredShard: (meta) => {
          carCID = meta.cid
        },
      }
    )

    assert(service.store.add.called)
    assert.equal(service.store.add.callCount, 1)
    assert(service.upload.add.called)
    assert.equal(service.upload.add.callCount, 1)

    assert(carCID)
    assert(dataCID)
  })

  it('allows custom shard size to be set', async () => {
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9200',
    }

    const space = await Signer.generate()
    const agent = await Signer.generate() // The "user" that will ask the service to accept the upload
    const files = [new File([await randomBytes(500_000)], '1.txt')]
    /** @type {import('../src/types').CARLink[]} */
    const carCIDs = []

    const proofs = await Promise.all([
      StoreCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
      UploadCapabilities.add.delegate({
        issuer: space,
        audience: agent,
        with: space.did(),
        expiration: Infinity,
      }),
    ])

    const service = mockService({
      store: { add: () => res },
      upload: { add: () => null },
    })

    const server = Server.create({
      id: serviceSigner,
      service,
      decoder: CAR,
      encoder: CBOR,
    })
    const connection = Client.connect({
      id: serviceSigner,
      encoder: CAR,
      decoder: CBOR,
      channel: server,
    })
    await uploadDirectory(
      // @ts-expect-error https://github.com/web3-storage/w3protocol/pull/181
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      files,
      {
        connection,
        shardSize: 400_000, // should end up with 2 CAR files
        onStoredShard: (meta) => carCIDs.push(meta.cid),
      }
    )

    assert.equal(carCIDs.length, 2)
  })
})

import assert from 'assert'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import { provide } from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as Signer from '@ucanto/principal/ed25519'
import * as StoreCapabilities from '@web3-storage/capabilities/store'
import * as UploadCapabilities from '@web3-storage/capabilities/upload'
import { uploadFile, uploadDirectory, uploadCAR } from '../src/index.js'
import { serviceSigner } from './fixtures.js'
import { randomBlock, randomBytes } from './helpers/random.js'
import { toCAR } from './helpers/car.js'
import { File } from './helpers/shims.js'
import { mockService } from './helpers/mocks.js'
import { encode } from '../src/car.js'

describe('uploadFile', () => {
  it('uploads a file to the service', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate() // The "user" that will ask the service to accept the upload
    const bytes = await randomBytes(128)
    const file = new Blob([bytes])
    const expectedCar = await toCAR(bytes)

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

    /** @type {import('../src/types.js').StoreAddUploadRequiredResponse} */
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9200',
      link: expectedCar.cid,
      with: space.did(),
    }

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
          return {
            root: expectedCar.roots[0],
            shards: [expectedCar.cid],
          }
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
        onShardStored: (meta) => {
          carCID = meta.cid
        },
      }
    )

    assert(service.store.add.called)
    assert.equal(service.store.add.callCount, 1)
    assert(service.upload.add.called)
    assert.equal(service.upload.add.callCount, 1)

    assert.equal(carCID?.toString(), expectedCar.cid.toString())
    assert.equal(dataCID.toString(), expectedCar.roots[0].toString())
  })

  it('allows custom shard size to be set', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate() // The "user" that will ask the service to accept the upload
    const file = new Blob([await randomBytes(1024 * 1024 * 5)])
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

    /** @type {Omit<import('../src/types.js').StoreAddUploadRequiredResponse, 'link'>} */
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9200',
      with: space.did(),
    }

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, ({ capability }) => ({
          ...res,
          link: /** @type {import('../src/types').CARLink} */ (
            capability.nb.link
          ),
        })),
      },
      upload: {
        add: provide(UploadCapabilities.add, ({ capability }) => {
          if (!capability.nb) throw new Error('nb must be present')
          return capability.nb
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
    await uploadFile(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      file,
      {
        connection,
        shardSize: 1024 * 1024 * 2, // should end up with 2 CAR files
        onShardStored: (meta) => carCIDs.push(meta.cid),
      }
    )

    assert.equal(carCIDs.length, 3)
  })
})

describe('uploadDirectory', () => {
  it('uploads a directory to the service', async () => {
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

    /** @type {Omit<import('../src/types.js').StoreAddUploadRequiredResponse, 'link'>} */
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9200',
      with: space.did(),
    }

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, ({ capability, invocation }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, StoreCapabilities.add.can)
          assert.equal(invCap.with, space.did())
          return {
            ...res,
            link: /** @type {import('../src/types').CARLink} */ (
              capability.nb.link
            ),
          }
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
          if (!invCap.nb) throw new Error('nb must be present')
          return invCap.nb
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
        onShardStored: (meta) => {
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

    /** @type {Omit<import('../src/types.js').StoreAddUploadRequiredResponse, 'link'>} */
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9200',
      with: space.did(),
    }

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, ({ capability }) => ({
          ...res,
          link: /** @type {import('../src/types').CARLink} */ (
            capability.nb.link
          ),
        })),
      },
      upload: {
        add: provide(UploadCapabilities.add, ({ capability }) => {
          if (!capability.nb) throw new Error('nb must be present')
          return capability.nb
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
    await uploadDirectory(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      files,
      {
        connection,
        shardSize: 400_000, // should end up with 2 CAR files
        onShardStored: (meta) => carCIDs.push(meta.cid),
      }
    )

    assert.equal(carCIDs.length, 2)
  })
})

describe('uploadCAR', () => {
  it('uploads a CAR file to the service', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const blocks = [
      await randomBlock(32),
      await randomBlock(32),
      await randomBlock(32),
    ]
    const car = await encode(blocks, blocks.at(-1)?.cid)
    // shard size 1 block less than total = 2 expected CAR shards
    const shardSize = blocks
      .slice(0, -1)
      .reduce((size, block) => size + block.bytes.length, 0)

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

    /** @type {Omit<import('../src/types.js').StoreAddUploadRequiredResponse, 'link'>} */
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9200',
      with: space.did(),
    }

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, ({ capability, invocation }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, StoreCapabilities.add.can)
          assert.equal(invCap.with, space.did())
          return {
            ...res,
            link: /** @type {import('../src/types').CARLink} */ (
              capability.nb.link
            ),
          }
        }),
      },
      upload: {
        add: provide(UploadCapabilities.add, ({ invocation }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          const invCap = invocation.capabilities[0]
          assert.equal(invCap.can, UploadCapabilities.add.can)
          assert.equal(invCap.with, space.did())
          if (!invCap.nb) throw new Error('nb must be present')
          assert.equal(invCap.nb.shards?.length, 2)
          invCap.nb.shards?.forEach((s, i) => {
            assert(s.toString(), carCIDs[i].toString())
          })
          return invCap.nb
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

    await uploadCAR(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      car,
      {
        connection,
        onShardStored: (meta) => carCIDs.push(meta.cid),
        shardSize,
      }
    )

    assert(service.store.add.called)
    assert.equal(service.store.add.callCount, 2)
    assert(service.upload.add.called)
    assert.equal(service.upload.add.callCount, 1)
    assert.equal(carCIDs.length, 2)
  })
})

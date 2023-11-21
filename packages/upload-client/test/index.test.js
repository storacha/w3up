import assert from 'assert'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import { provide } from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as Signer from '@ucanto/principal/ed25519'
import * as StoreCapabilities from '@web3-storage/capabilities/store'
import * as UploadCapabilities from '@web3-storage/capabilities/upload'
import { uploadFile, uploadDirectory, uploadCAR } from '../src/index.js'
import { serviceSigner } from './fixtures.js'
import { randomBlock, randomBytes } from './helpers/random.js'
import { toCAR } from './helpers/car.js'
import { File } from './helpers/shims.js'
import { mockService } from './helpers/mocks.js'
import { validateAuthorization } from './helpers/utils.js'
import {
  blockEncodingLength,
  encode,
  headerEncodingLength,
} from '../src/car.js'
import { toBlock } from './helpers/block.js'

describe('uploadFile', () => {
  it('uploads a file to the service', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate() // The "user" that will ask the service to accept the upload
    const bytes = await randomBytes(128)
    const file = new Blob([bytes])
    const expectedCar = await toCAR(bytes)

    /** @type {import('../src/types.js').CARLink|undefined} */
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

    /** @type {import('../src/types.js').StoreAddSuccessUpload} */
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
          return { ok: res }
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
            ok: {
              root: expectedCar.roots[0],
              shards: [expectedCar.cid],
            },
          }
        }),
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
    /** @type {import('../src/types.js').CARLink[]} */
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

    /** @type {Omit<import('../src/types.js').StoreAddSuccessUpload, 'link'>} */
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9200',
      with: space.did(),
    }

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, ({ capability }) => ({
          ok: {
            ...res,
            link: /** @type {import('../src/types.js').CARLink} */ (
              capability.nb.link
            ),
          },
        })),
      },
      upload: {
        add: provide(UploadCapabilities.add, ({ capability }) => {
          if (!capability.nb) throw new Error('nb must be present')
          return { ok: capability.nb }
        }),
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
    await uploadFile(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      file,
      {
        connection,
        // chunk size = 1_048_576
        // encoded block size = 1_048_615
        // shard size = 2_097_152 (as configured below)
        // total file size = 5_242_880 (as above)
        // so, at least 2 shards, but 2 encoded blocks (_without_ CAR header) = 2_097_230
        // ...which is > shard size of 2_097_152
        // so we actually end up with a shard for each block - 5 CARs!
        shardSize: 1024 * 1024 * 2,
        onShardStored: (meta) => carCIDs.push(meta.cid),
      }
    )

    assert.equal(carCIDs.length, 5)
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

    /** @type {import('../src/types.js').CARLink?} */
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

    /** @type {Omit<import('../src/types.js').StoreAddSuccessUpload, 'link'>} */
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
            ok: {
              ...res,
              link: /** @type {import('../src/types.js').CARLink} */ (
                capability.nb.link
              ),
            },
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
          return { ok: invCap.nb }
        }),
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
    /** @type {import('../src/types.js').CARLink[]} */
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

    /** @type {Omit<import('../src/types.js').StoreAddSuccessUpload, 'link'>} */
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9200',
      with: space.did(),
    }

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, ({ capability }) => ({
          ok: {
            ...res,
            link: /** @type {import('../src/types.js').CARLink} */ (
              capability.nb.link
            ),
          },
        })),
      },
      upload: {
        add: provide(UploadCapabilities.add, ({ capability }) => {
          if (!capability.nb) throw new Error('nb must be present')
          return { ok: capability.nb }
        }),
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
    await uploadDirectory(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      files,
      {
        connection,
        shardSize: 500_056, // should end up with 2 CAR files
        onShardStored: (meta) => carCIDs.push(meta.cid),
      }
    )

    assert.equal(carCIDs.length, 2)
  })

  it('ensures files is sorted unless wrapped with allowUnsorted', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate() // The "user" that will ask the service to accept the upload
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
        add: provide(StoreCapabilities.add, ({ capability }) => ({
          ok: {
            status: 'upload',
            headers: { 'x-test': 'true' },
            url: 'http://localhost:9200',
            with: space.did(),
            link: /** @type {import('../src/types.js').CARLink} */ (
              capability.nb.link
            ),
          },
        })),
      },
      upload: {
        add: provide(UploadCapabilities.add, ({ capability }) => {
          if (!capability.nb) throw new Error('nb must be present')
          return { ok: capability.nb }
        }),
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
    /**
     * @param {Iterable<import('../src/types.js').FileLike>} files
     */
    const upload = (files) =>
      uploadDirectory(
        { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
        files,
        {
          connection,
        }
      )

    const unsortedFiles = [
      new File([await randomBytes(32)], 'b.txt'),
      new File([await randomBytes(32)], 'c.txt'),
      new File([await randomBytes(32)], 'a.txt'),
    ]
    assert.rejects(
      upload(unsortedFiles),
      'uploading unsorted files returns rejected promise'
    )

    // sorted files should work
    const sortedFiles = [...unsortedFiles].sort(function (a, b) {
      return a.name < b.name ? -1 : 1
    })
    assert.doesNotReject(
      upload(sortedFiles),
      'uploading unsorted files returns rejected promise'
    )

    // can mark files as sortingNotRequired
    assert.doesNotReject(
      upload(Object.assign([...unsortedFiles], { sorted: false })),
      'can upload usnorted files if wrapped in allowUnsorted'
    )
  })
})

describe('uploadCAR', () => {
  it('uploads a CAR file to the service', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const blocks = [
      await randomBlock(128),
      await randomBlock(128),
      await randomBlock(128),
    ]
    const car = await encode(blocks, blocks.at(-1)?.cid)
    // Wanted: 2 shards
    // 2 * CAR header (34) + 2 * blocks (256), 2 * block encoding prefix (78)
    const shardSize =
      headerEncodingLength() * 2 +
      blocks
        .slice(0, -1)
        .reduce((size, block) => size + blockEncodingLength(block), 0)

    /** @type {import('../src/types.js').CARLink[]} */
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

    /** @type {Omit<import('../src/types.js').StoreAddSuccessUpload, 'link'>} */
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
            ok: {
              ...res,
              link: /** @type {import('../src/types.js').CARLink} */ (
                capability.nb.link
              ),
            },
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
          return {
            ok: invCap.nb,
          }
        }),
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

  it('computes piece CID', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const blocks = [
      await toBlock(new Uint8Array([1, 3, 8])),
      await toBlock(new Uint8Array([1, 1, 3, 8])),
    ]
    const car = await encode(blocks, blocks.at(-1)?.cid)

    /** @type {import('../src/types.js').PieceLink[]} */
    const pieceCIDs = []

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

    /** @type {Omit<import('../src/types.js').StoreAddSuccessUpload, 'link'>} */
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
            ok: {
              ...res,
              link: /** @type {import('../src/types.js').CARLink} */ (
                capability.nb.link
              ),
            },
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
          assert.equal(invCap.nb.shards?.length, 1)
          return {
            ok: invCap.nb,
          }
        }),
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

    await uploadCAR(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      car,
      {
        connection,
        onShardStored: (meta) => pieceCIDs.push(meta.piece),
      }
    )

    assert(service.store.add.called)
    assert.equal(service.store.add.callCount, 1)
    assert(service.upload.add.called)
    assert.equal(service.upload.add.callCount, 1)
    assert.equal(pieceCIDs.length, 1)
    assert.equal(
      pieceCIDs[0].toString(),
      'bafkzcibcoibrsisrq3nrfmsxvynduf4kkf7qy33ip65w7ttfk7guyqod5w5mmei'
    )
  })
})

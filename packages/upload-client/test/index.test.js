import assert from 'assert'
import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import { provide } from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as Signer from '@ucanto/principal/ed25519'
import * as StoreCapabilities from '@web3-storage/capabilities/store'
import * as UploadCapabilities from '@web3-storage/capabilities/upload'
import * as StorefrontCapabilities from '@web3-storage/capabilities/filecoin/storefront'
import { Piece } from '@web3-storage/data-segment'
import {
  uploadFile,
  uploadDirectory,
  uploadCAR,
  defaultFileComparator,
} from '../src/index.js'
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
import { getFilecoinOfferResponse } from './helpers/filecoin.js'

describe('uploadFile', () => {
  it('uploads a file to the service', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate() // The "user" that will ask the service to accept the upload
    const bytes = await randomBytes(128)
    const file = new Blob([bytes])
    const expectedCar = await toCAR(bytes)
    const piece = Piece.fromPayload(bytes).link

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

    /** @type {Omit<import('../src/types.js').StoreAddSuccessUpload, 'allocated'>} */
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9200',
      link: expectedCar.cid,
      with: space.did(),
    }

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, ({ invocation, capability }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          assert.equal(capability.can, StoreCapabilities.add.can)
          assert.equal(capability.with, space.did())
          return { ok: { ...res, allocated: capability.nb.size } }
        }),
      },
      filecoin: {
        offer: Server.provideAdvanced({
          capability: StorefrontCapabilities.filecoinOffer,
          handler: async ({ invocation, context }) => {
            const invCap = invocation.capabilities[0]
            if (!invCap.nb) {
              throw new Error('no params received')
            }
            return getFilecoinOfferResponse(context.id, piece, invCap.nb)
          },
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
    assert(service.filecoin.offer.called)
    assert.equal(service.filecoin.offer.callCount, 1)
    assert(service.upload.add.called)
    assert.equal(service.upload.add.callCount, 1)

    assert.equal(carCID?.toString(), expectedCar.cid.toString())
    assert.equal(dataCID.toString(), expectedCar.roots[0].toString())
  })

  it('allows custom shard size to be set', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate() // The "user" that will ask the service to accept the upload
    const bytes = await randomBytes(1024 * 1024 * 5)
    const file = new Blob([bytes])
    const piece = Piece.fromPayload(bytes).link
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

    /** @type {Omit<import('../src/types.js').StoreAddSuccessUpload, 'link'|'allocated'>} */
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
            allocated: capability.nb.size,
          },
        })),
      },
      filecoin: {
        offer: Server.provideAdvanced({
          capability: StorefrontCapabilities.filecoinOffer,
          handler: async ({ invocation, context }) => {
            const invCap = invocation.capabilities[0]
            if (!invCap.nb) {
              throw new Error('no params received')
            }
            return getFilecoinOfferResponse(context.id, piece, invCap.nb)
          },
        }),
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

  it('fails to upload a file to the service if `filecoin/piece` invocation fails', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate() // The "user" that will ask the service to accept the upload
    const bytes = await randomBytes(128)
    const file = new Blob([bytes])
    const expectedCar = await toCAR(bytes)

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

    /** @type {Omit<import('../src/types.js').StoreAddSuccessUpload, 'allocated'>} */
    const res = {
      status: 'upload',
      headers: { 'x-test': 'true' },
      url: 'http://localhost:9200',
      link: expectedCar.cid,
      with: space.did(),
    }

    const service = mockService({
      store: {
        add: provide(StoreCapabilities.add, ({ invocation, capability }) => {
          assert.equal(invocation.issuer.did(), agent.did())
          assert.equal(invocation.capabilities.length, 1)
          assert.equal(capability.can, StoreCapabilities.add.can)
          assert.equal(capability.with, space.did())
          return { ok: { ...res, allocated: capability.nb.size } }
        }),
      },
      filecoin: {
        offer: Server.provideAdvanced({
          capability: StorefrontCapabilities.filecoinOffer,
          handler: async ({ invocation, context }) => {
            return {
              error: new Server.Failure('did not find piece'),
            }
          },
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
    await assert.rejects(async () =>
      uploadFile(
        { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
        file,
        {
          connection,
        }
      )
    )

    assert(service.store.add.called)
    assert.equal(service.store.add.callCount, 1)
    assert(service.filecoin.offer.called)
    assert.equal(service.filecoin.offer.callCount, 1)
  })
})

describe('uploadDirectory', () => {
  it('uploads a directory to the service', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate()
    const bytesList = [await randomBytes(128), await randomBytes(32)]
    const files = bytesList.map(
      (bytes, index) => new File([bytes], `${index}.txt`)
    )
    const pieces = bytesList.map((bytes) => Piece.fromPayload(bytes).link)

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

    /** @type {Omit<import('../src/types.js').StoreAddSuccessUpload, 'link'|'allocated'>} */
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
              allocated: capability.nb.size,
            },
          }
        }),
      },
      filecoin: {
        offer: Server.provideAdvanced({
          capability: StorefrontCapabilities.filecoinOffer,
          handler: async ({ invocation, context }) => {
            const invCap = invocation.capabilities[0]
            if (!invCap.nb) {
              throw new Error('no params received')
            }
            return getFilecoinOfferResponse(context.id, pieces[0], invCap.nb)
          },
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
    assert(service.filecoin.offer.called)
    assert.equal(service.filecoin.offer.callCount, 1)
    assert(service.upload.add.called)
    assert.equal(service.upload.add.callCount, 1)

    assert(carCID)
    assert(dataCID)
  })

  it('allows custom shard size to be set', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate() // The "user" that will ask the service to accept the upload
    const bytesList = [await randomBytes(500_000)]
    const files = bytesList.map(
      (bytes, index) => new File([bytes], `${index}.txt`)
    )
    const pieces = bytesList.map((bytes) => Piece.fromPayload(bytes).link)
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

    /** @type {Omit<import('../src/types.js').StoreAddSuccessUpload, 'link'|'allocated'>} */
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
            allocated: capability.nb.size,
          },
        })),
      },
      filecoin: {
        offer: Server.provideAdvanced({
          capability: StorefrontCapabilities.filecoinOffer,
          handler: async ({ invocation, context }) => {
            const invCap = invocation.capabilities[0]
            if (!invCap.nb) {
              throw new Error('no params received')
            }
            return getFilecoinOfferResponse(context.id, pieces[0], invCap.nb)
          },
        }),
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

  it('sorts files unless options.customOrder', async () => {
    const space = await Signer.generate()
    const agent = await Signer.generate() // The "user" that will ask the service to accept the upload
    const someBytes = await randomBytes(32)
    const piece = Piece.fromPayload(someBytes).link

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
    function createSimpleMockUploadServer() {
      /**
       * @type {Array<Server.ProviderInput<import('@ucanto/interface').InferInvokedCapability<import('@web3-storage/capabilities').Store['add']|import('@web3-storage/capabilities').Upload['add']>>>}
       */
      const invocations = []
      const service = mockService({
        store: {
          add: provide(StoreCapabilities.add, (invocation) => {
            invocations.push(invocation)
            return {
              ok: {
                status: 'upload',
                headers: { 'x-test': 'true' },
                url: 'http://localhost:9200',
                with: invocation.capability.with,
                link: /** @type {import('../src/types.js').CARLink} */ (
                  invocation.capability.nb.link
                ),
                allocated: invocation.capability.nb.size,
              },
            }
          }),
        },
        filecoin: {
          offer: Server.provideAdvanced({
            capability: StorefrontCapabilities.filecoinOffer,
            handler: async ({ invocation, context }) => {
              const invCap = invocation.capabilities[0]
              if (!invCap.nb) {
                throw new Error('no params received')
              }
              return getFilecoinOfferResponse(context.id, piece, invCap.nb)
            },
          }),
        },
        upload: {
          add: provide(UploadCapabilities.add, (invocation) => {
            invocations.push(invocation)
            const { capability } = invocation
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
      return { invocations, service, server, connection }
    }

    const unsortedFiles = [
      new File([await randomBytes(32)], '/b.txt'),
      new File([await randomBytes(32)], '/b.txt'),
      new File([await randomBytes(32)], 'c.txt'),
      new File([await randomBytes(32)], 'a.txt'),
    ]

    const uploadServiceForUnordered = createSimpleMockUploadServer()
    // uploading unsorted files should work because they should be sorted by `uploadDirectory`
    const uploadedDirUnsorted = await uploadDirectory(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      unsortedFiles,
      { connection: uploadServiceForUnordered.connection }
    )

    const uploadServiceForOrdered = createSimpleMockUploadServer()
    // uploading sorted files should also work
    const uploadedDirSorted = await uploadDirectory(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      [...unsortedFiles].sort(defaultFileComparator),
      { connection: uploadServiceForOrdered.connection }
    )

    // upload/add roots should be the same.
    assert.equal(
      uploadedDirUnsorted.toString(),
      uploadedDirSorted.toString(),
      'CID of upload/add root is same regardless of whether files param is sorted or unsorted'
    )

    // We also need to make sure the underlying shards are the same.
    const shardsForUnordered = uploadServiceForUnordered.invocations
      .flatMap((i) =>
        i.capability.can === 'upload/add' ? i.capability.nb.shards ?? [] : []
      )
      .map((cid) => cid.toString())
    const shardsForOrdered = uploadServiceForOrdered.invocations
      .flatMap((i) =>
        i.capability.can === 'upload/add' ? i.capability.nb.shards ?? [] : []
      )
      .map((cid) => cid.toString())
    assert.deepEqual(
      shardsForUnordered,
      shardsForOrdered,
      'upload/add .nb.shards is identical regardless of ordering of files passed to uploadDirectory'
    )

    // but if options.customOrder is truthy, the caller is indicating
    // they have customized the order of files, so `uploadDirectory` will not sort them
    const uploadServiceForCustomOrder = createSimpleMockUploadServer()
    const uploadedDirCustomOrder = await uploadDirectory(
      { issuer: agent, with: space.did(), proofs, audience: serviceSigner },
      [...unsortedFiles],
      { connection: uploadServiceForCustomOrder.connection, customOrder: true }
    )
    const shardsForCustomOrder = uploadServiceForCustomOrder.invocations
      .flatMap((i) =>
        i.capability.can === 'upload/add' ? i.capability.nb.shards ?? [] : []
      )
      .map((cid) => cid.toString())
    assert.notDeepEqual(
      shardsForCustomOrder,
      shardsForOrdered,
      'should not produce sorted shards for customOrder files'
    )
    // upload/add roots will also be different
    assert.notEqual(
      uploadedDirCustomOrder.toString(),
      shardsForOrdered.toString()
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
    const someBytes = new Uint8Array(await car.arrayBuffer())
    const piece = Piece.fromPayload(someBytes).link
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

    /** @type {Omit<import('../src/types.js').StoreAddSuccessUpload, 'link'|'allocated'>} */
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
              allocated: capability.nb.size,
            },
          }
        }),
      },
      filecoin: {
        offer: Server.provideAdvanced({
          capability: StorefrontCapabilities.filecoinOffer,
          handler: async ({ invocation, context }) => {
            const invCap = invocation.capabilities[0]
            if (!invCap.nb) {
              throw new Error('no params received')
            }
            return getFilecoinOfferResponse(context.id, piece, invCap.nb)
          },
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
    assert(service.filecoin.offer.called)
    assert.equal(service.filecoin.offer.callCount, 2)
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
    const someBytes = new Uint8Array(await car.arrayBuffer())
    const piece = Piece.fromPayload(someBytes).link

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

    /** @type {Omit<import('../src/types.js').StoreAddSuccessUpload, 'link'|'allocated'>} */
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
          assert.equal(capability.can, StoreCapabilities.add.can)
          assert.equal(capability.with, space.did())
          return {
            ok: {
              ...res,
              link: /** @type {import('../src/types.js').CARLink} */ (
                capability.nb.link
              ),
              allocated: capability.nb.size,
            },
          }
        }),
      },
      filecoin: {
        offer: Server.provideAdvanced({
          capability: StorefrontCapabilities.filecoinOffer,
          handler: async ({ invocation, context }) => {
            const invCap = invocation.capabilities[0]
            if (!invCap.nb) {
              throw new Error('no params received')
            }
            return getFilecoinOfferResponse(context.id, piece, invCap.nb)
          },
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
    assert(service.filecoin.offer.called)
    assert.equal(service.filecoin.offer.callCount, 1)
    assert(service.upload.add.called)
    assert.equal(service.upload.add.callCount, 1)
    assert.equal(pieceCIDs.length, 1)
    assert.equal(
      pieceCIDs[0].toString(),
      'bafkzcibcoibrsisrq3nrfmsxvynduf4kkf7qy33ip65w7ttfk7guyqod5w5mmei'
    )
  })
})

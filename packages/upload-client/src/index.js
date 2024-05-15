import * as PieceHasher from '@web3-storage/data-segment/multihash'
import { Storefront } from '@web3-storage/filecoin-client'
import { ShardedDAGIndex } from '@web3-storage/blob-index'
import * as Link from 'multiformats/link'
import * as raw from 'multiformats/codecs/raw'
import * as Store from './store.js'
import * as Blob from './blob.js'
import * as Index from './dag-index.js'
import * as Upload from './upload.js'
import * as UnixFS from './unixfs.js'
import * as CAR from './car.js'
import { ShardingStream, defaultFileComparator } from './sharding.js'
import { codec as carCodec } from '@ucanto/transport/car'

export { Blob, Index, Store, Upload, UnixFS, CAR }
export * from './sharding.js'

/**
 * Uploads a file to the service and returns the root data CID for the
 * generated DAG.
 *
 * Required delegated capability proofs: `blob/add`, `index/add`,
 * `filecoin/offer`, `upload/add`
 *
 * @param {import('./types.js').InvocationConfig} conf Configuration
 * for the UCAN invocation. An object with `issuer`, `with` and `proofs`.
 *
 * The `issuer` is the signing authority that is issuing the UCAN
 * invocation(s). It is typically the user _agent_.
 *
 * The `with` is the resource the invocation applies to. It is typically the
 * DID of a space.
 *
 * The `proofs` are a set of capability delegations that prove the issuer
 * has the capability to perform the action.
 *
 * The issuer needs the `blob/add`, `index/add`, `filecoin/offer` and
 * `upload/add` delegated capability.
 * @param {import('./types.js').BlobLike} file File data.
 * @param {import('./types.js').UploadOptions} [options]
 */
export async function uploadFile(conf, file, options = {}) {
  return await uploadBlockStream(
    conf,
    UnixFS.createFileEncoderStream(file),
    options
  )
}

/**
 * Uploads a directory of files to the service and returns the root data CID
 * for the generated DAG. All files are added to a container directory, with
 * paths in file names preserved.
 *
 * Required delegated capability proofs: `blob/add`, `index/add`,
 * `filecoin/offer`, `upload/add`
 *
 * @param {import('./types.js').InvocationConfig} conf Configuration
 * for the UCAN invocation. An object with `issuer`, `with` and `proofs`.
 *
 * The `issuer` is the signing authority that is issuing the UCAN
 * invocation(s). It is typically the user _agent_.
 *
 * The `with` is the resource the invocation applies to. It is typically the
 * DID of a space.
 *
 * The `proofs` are a set of capability delegations that prove the issuer
 * has the capability to perform the action.
 *
 * The issuer needs the `blob/add`, `index/add`, `filecoin/offer` and
 * `upload/add` delegated capability.
 * @param {import('./types.js').FileLike[]} files  Files that should be in the directory.
 * To ensure determinism in the IPLD encoding, files are automatically sorted by `file.name`.
 * To retain the order of the files as passed in the array, set `customOrder` option to `true`.
 * @param {import('./types.js').UploadDirectoryOptions} [options]
 */
export async function uploadDirectory(conf, files, options = {}) {
  const { customOrder = false } = options
  const entries = customOrder ? files : [...files].sort(defaultFileComparator)
  return await uploadBlockStream(
    conf,
    UnixFS.createDirectoryEncoderStream(entries, options),
    options
  )
}

/**
 * Uploads a CAR file to the service.
 *
 * The difference between this function and `Store.add` is that the CAR file is
 * automatically sharded and an "upload" is registered, linking the individual
 * shards (see `Upload.add`).
 *
 * Use the `onShardStored` callback to obtain the CIDs of the CAR file shards.
 *
 * Required delegated capability proofs: `blob/add`, `index/add`,
 * `filecoin/offer`, `upload/add`
 *
 * @param {import('./types.js').InvocationConfig} conf Configuration
 * for the UCAN invocation. An object with `issuer`, `with` and `proofs`.
 *
 * The `issuer` is the signing authority that is issuing the UCAN
 * invocation(s). It is typically the user _agent_.
 *
 * The `with` is the resource the invocation applies to. It is typically the
 * DID of a space.
 *
 * The `proofs` are a set of capability delegations that prove the issuer
 * has the capability to perform the action.
 *
 * The issuer needs the `blob/add`, `index/add`, `filecoin/offer` and `upload/add` delegated capability.
 * @param {import('./types.js').BlobLike} car CAR file.
 * @param {import('./types.js').UploadOptions} [options]
 */
export async function uploadCAR(conf, car, options = {}) {
  const blocks = new CAR.BlockStream(car)
  options.rootCID = options.rootCID ?? (await blocks.getRoots())[0]
  return await uploadBlockStream(conf, blocks, options)
}

/**
 * @param {import('./types.js').InvocationConfig} conf
 * @param {ReadableStream<import('@ipld/unixfs').Block>} blocks
 * @param {import('./types.js').UploadOptions} [options]
 * @returns {Promise<import('./types.js').AnyLink>}
 */
async function uploadBlockStream(
  conf,
  blocks,
  { pieceHasher = PieceHasher, ...options } = {}
) {
  /** @type {Array<Map<import('./types.js').SliceDigest, import('./types.js').Position>>} */
  const shardIndexes = []
  /** @type {import('./types.js').CARLink[]} */
  const shards = []
  /** @type {import('./types.js').AnyLink?} */
  let root = null
  await blocks
    .pipeThrough(new ShardingStream(options))
    .pipeThrough(
      /** @type {TransformStream<import('./types.js').IndexedCARFile, import('./types.js').CARMetadata>} */
      (
        new TransformStream({
          async transform(car, controller) {
            const bytes = new Uint8Array(await car.arrayBuffer())
            // Invoke blob/add and write bytes to write target
            const multihash = await Blob.add(conf, bytes, options)
            // Should this be raw instead?
            const cid = Link.create(carCodec.code, multihash)
            let piece
            if (pieceHasher) {
              const multihashDigest = await pieceHasher.digest(bytes)
              /** @type {import('@web3-storage/capabilities/types').PieceLink} */
              piece = Link.create(raw.code, multihashDigest)
              const content = Link.create(raw.code, multihash)

              // Invoke filecoin/offer for data
              const result = await Storefront.filecoinOffer(
                {
                  issuer: conf.issuer,
                  audience: conf.audience,
                  // Resource of invocation is the issuer did for being self issued
                  with: conf.issuer.did(),
                  proofs: conf.proofs,
                },
                content,
                piece,
                options
              )

              if (result.out.error) {
                throw new Error(
                  'failed to offer piece for aggregation into filecoin deal',
                  { cause: result.out.error }
                )
              }
            }
            const { version, roots, size, slices } = car
            controller.enqueue({ version, roots, size, cid, piece, slices })
          },
        })
      )
    )
    .pipeTo(
      new WritableStream({
        write(meta) {
          root = root || meta.roots[0]
          shards.push(meta.cid)

          // add the CAR shard itself to the slices
          meta.slices.set(meta.cid.multihash, [0, meta.size])
          shardIndexes.push(meta.slices)

          if (options.onShardStored) options.onShardStored(meta)
        },
      })
    )

  /* c8 ignore next */
  if (!root) throw new Error('missing root CID')

  const index = ShardedDAGIndex.create(root)
  for (const [i, shard] of shards.entries()) {
    const slices = shardIndexes[i]
    index.shards.set(shard.multihash, slices)
  }
  const indexBytes = await index.archive()
  /* c8 ignore next 3 */
  if (!indexBytes.ok) {
    throw new Error('failed to archive DAG index', { cause: indexBytes.error })
  }

  // Store the index in the space
  const indexDigest = await Blob.add(conf, indexBytes.ok, options)
  const indexLink = Link.create(carCodec.code, indexDigest)

  // Register the index with the service
  await Index.add(conf, indexLink, options)
  // Register an upload with the service
  await Upload.add(conf, root, shards, options)

  return root
}

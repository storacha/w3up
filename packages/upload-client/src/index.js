import { Parallel } from 'parallel-transform-web'
import * as PieceHasher from '@web3-storage/data-segment/multihash'
import * as Link from 'multiformats/link'
import * as raw from 'multiformats/codecs/raw'
import * as Store from './store.js'
import * as Upload from './upload.js'
import * as UnixFS from './unixfs.js'
import * as CAR from './car.js'
import { ShardingStream, defaultFileComparator } from './sharding.js'

export { Store, Upload, UnixFS, CAR }
export * from './sharding.js'

const CONCURRENT_REQUESTS = 3

/**
 * Uploads a file to the service and returns the root data CID for the
 * generated DAG.
 *
 * Required delegated capability proofs: `store/add`, `upload/add`
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
 * The issuer needs the `store/add` and `upload/add` delegated capability.
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
 * Required delegated capability proofs: `store/add`, `upload/add`
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
 * The issuer needs the `store/add` and `upload/add` delegated capability.
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
 * Required delegated capability proofs: `store/add`, `upload/add`
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
 * The issuer needs the `store/add` and `upload/add` delegated capability.
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
async function uploadBlockStream(conf, blocks, options = {}) {
  /** @type {import('./types.js').CARLink[]} */
  const shards = []
  /** @type {import('./types.js').AnyLink?} */
  let root = null
  const concurrency = options.concurrentRequests ?? CONCURRENT_REQUESTS
  const hasher = options.pieceHasher ?? PieceHasher
  await blocks
    .pipeThrough(new ShardingStream(options))
    .pipeThrough(
      new Parallel(concurrency, async (car) => {
        const bytes = new Uint8Array(await car.arrayBuffer())
        const [cid, piece] = await Promise.all([
          Store.add(conf, bytes, options),
          (async () => {
            const multihashDigest = await hasher.digest(bytes)
            return /** @type {import('@web3-storage/capabilities/types').PieceLink} */ (
              Link.create(raw.code, multihashDigest)
            )
          })(),
        ])
        const { version, roots, size } = car
        return { version, roots, size, cid, piece }
      })
    )
    .pipeTo(
      new WritableStream({
        write(meta) {
          root = root || meta.roots[0]
          shards.push(meta.cid)
          if (options.onShardStored) options.onShardStored(meta)
        },
      })
    )

  /* c8 ignore next */
  if (!root) throw new Error('missing root CID')

  await Upload.add(conf, root, shards, options)
  return root
}

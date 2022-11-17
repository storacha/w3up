import * as Storage from './store.js'
import * as Upload from './upload.js'
import * as UnixFS from './unixfs.js'
import * as CAR from './car.js'
import { ShardingStream, ShardStoringStream } from './sharding.js'

export { Storage, Upload, UnixFS, CAR }
export * from './sharding.js'

/**
 * @typedef {(meta: import('./types').CARMetadata) => void} StoredShardCallback
 * @typedef {import('./types').RequestOptions & { onStoredShard?: StoredShardCallback }} UploadOptions
 */

/**
 * Uploads a file to the service and returns the root data CID for the
 * generated DAG.
 *
 * Required delegated capability proofs: `store/add`, `upload/add`
 *
 * @param {import('./types').InvocationConfig} invocationConfig Configuration
 * for the UCAN invocation. An object with `issuer` and `proofs`.
 *
 * The `issuer` is the signing authority that is issuing the UCAN
 * invocation(s). It is typically the user _agent_.
 *
 * The `proofs` are a set of capability delegations that prove the issuer
 * has the capability to perform the action.
 *
 * The issuer needs the `store/add` and `upload/add` delegated capability.
 * @param {Blob} file File data.
 * @param {UploadOptions} [options]
 */
export async function uploadFile({ issuer, proofs }, file, options = {}) {
  return await uploadBlockStream(
    { issuer, proofs },
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
 * @param {import('./types').InvocationConfig} invocationConfig Configuration
 * for the UCAN invocation. An object with `issuer` and `proofs`.
 *
 * The `issuer` is the signing authority that is issuing the UCAN
 * invocation(s). It is typically the user _agent_.
 *
 * The `proofs` are a set of capability delegations that prove the issuer
 * has the capability to perform the action.
 *
 * The issuer needs the `store/add` and `upload/add` delegated capability.
 * @param {import('./types').FileLike[]} files File data.
 * @param {UploadOptions} [options]
 */
export async function uploadDirectory({ issuer, proofs }, files, options = {}) {
  return await uploadBlockStream(
    { issuer, proofs },
    UnixFS.createDirectoryEncoderStream(files),
    options
  )
}

/**
 * @param {import('./types').InvocationConfig} invocationConfig
 * @param {ReadableStream<import('@ipld/unixfs').Block>} blocks
 * @param {UploadOptions} [options]
 * @returns {Promise<import('./types').AnyLink>}
 */
async function uploadBlockStream({ issuer, proofs }, blocks, options = {}) {
  /** @type {import('./types').CARLink[]} */
  const shards = []
  /** @type {import('./types').AnyLink?} */
  let root = null
  await blocks
    .pipeThrough(new ShardingStream())
    .pipeThrough(new ShardStoringStream({ issuer, proofs }, options))
    .pipeTo(
      new WritableStream({
        write(meta) {
          root = root || meta.roots[0]
          shards.push(meta.cid)
          if (options.onStoredShard) options.onStoredShard(meta)
        },
      })
    )

  /* c8 ignore next */
  if (!root) throw new Error('missing root CID')

  await Upload.add({ issuer, proofs }, root, shards, options)
  return root
}

import * as Storage from './storage.js'
import * as UnixFS from './unixfs.js'
import * as CAR from './car.js'
import { ShardingStream, ShardStoringStream } from './sharding.js'

export { Storage, UnixFS, CAR }
export * from './sharding.js'

/**
 * @typedef {(meta: import('./types').CARMetadata) => void} StoredShardCallback
 * @typedef {import('./types').RequestOptions & { onStoredShard?: StoredShardCallback }} UploadOptions
 */

/**
 * @param {import('@ucanto/interface').Signer} issuer Signing authority that is
 * issuing the UCAN invocations. Typically the user _agent_.
 * @param {import('@ucanto/interface').Proof[]} proofs Proof(s) the issuer
 * has the capability to perform the action. At minimum the issuer needs the
 * `store/add` and `upload/add` delegated capability.
 * @param {Blob} file File data.
 * @param {UploadOptions} [options]
 */
export async function uploadFile(issuer, proofs, file, options = {}) {
  return await uploadBlockStream(
    issuer,
    proofs,
    UnixFS.createFileEncoderStream(file),
    options
  )
}

/**
 * @param {import('@ucanto/interface').Signer} issuer Signing authority that is
 * issuing the UCAN invocations. Typically the user _agent_.
 * @param {import('@ucanto/interface').Proof[]} proofs Proof(s) the issuer
 * has the capability to perform the action. At minimum the issuer needs the
 * `store/add` and `upload/add` delegated capability.
 * @param {import('./types').FileLike[]} files File data.
 * @param {UploadOptions} [options]
 */
export async function uploadDirectory(issuer, proofs, files, options = {}) {
  return await uploadBlockStream(
    issuer,
    proofs,
    UnixFS.createDirectoryEncoderStream(files),
    options
  )
}

/**
 * @param {import('@ucanto/interface').Signer} issuer
 * @param {import('@ucanto/interface').Proof[]} proofs
 * @param {ReadableStream<import('@ipld/unixfs').Block>} blocks
 * @param {UploadOptions} [options]
 */
async function uploadBlockStream(issuer, proofs, blocks, options = {}) {
  const onStoredShard = options.onStoredShard ?? (() => {})

  /** @type {import('./types').CARLink[]} */
  const shards = []
  /** @type {import('multiformats').Link<unknown, number, number, import('multiformats').Version>?} */
  let root = null
  await blocks
    .pipeThrough(new ShardingStream())
    .pipeThrough(new ShardStoringStream(issuer, proofs, options))
    .pipeTo(
      new WritableStream({
        write(meta) {
          root = root || meta.roots[0]
          shards.push(meta.cid)
          onStoredShard(meta)
        },
      })
    )

  if (root == null) throw new Error('missing root CID')

  await Storage.registerUpload(issuer, proofs, root, shards, options)
  return root
}

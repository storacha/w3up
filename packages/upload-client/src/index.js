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
 * @param {import('@ucanto/interface').Signer} issuer Signing authority. Usually the user agent.
 * @param {import('@ucanto/interface').Delegation} proof Proof the signer has the capability to perform the action.
 * @param {Blob} file File data.
 * @param {UploadOptions} [options]
 */
export async function uploadFile(issuer, proof, file, options = {}) {
  return await uploadBlockStream(
    issuer,
    proof,
    UnixFS.createFileEncoderStream(file),
    options
  )
}

/**
 * @param {import('@ucanto/interface').Signer} issuer Signing authority. Usually the user agent.
 * @param {import('@ucanto/interface').Delegation} proof Proof the signer has the capability to perform the action.
 * @param {import('./types').FileLike[]} files File data.
 * @param {UploadOptions} [options]
 */
export async function uploadDirectory(issuer, proof, files, options = {}) {
  return await uploadBlockStream(
    issuer,
    proof,
    UnixFS.createDirectoryEncoderStream(files),
    options
  )
}

/**
 * @param {import('@ucanto/interface').Signer} issuer
 * @param {import('@ucanto/interface').Delegation} proof
 * @param {ReadableStream<import('@ipld/unixfs').Block>} blocks
 * @param {UploadOptions} [options]
 */
async function uploadBlockStream(issuer, proof, blocks, options = {}) {
  const onStoredShard = options.onStoredShard ?? (() => {})

  /** @type {import('./types').CARLink[]} */
  const shards = []
  /** @type {import('multiformats').Link<unknown, number, number, import('multiformats').Version>?} */
  let root = null
  await blocks
    .pipeThrough(new ShardingStream())
    .pipeThrough(new ShardStoringStream(issuer, proof, options))
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

  await Storage.registerUpload(issuer, proof, root, shards, options)
  return root
}

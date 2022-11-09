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
 * @param {import('@ucanto/interface').DID} account DID of the account that is receiving the upload.
 * @param {import('@ucanto/interface').Signer} signer Signing authority. Usually the user agent.
 * @param {Blob} file File data.
 * @param {UploadOptions} [options]
 */
export async function uploadFile(account, signer, file, options = {}) {
  return await uploadBlockStream(
    account,
    signer,
    UnixFS.createFileEncoderStream(file),
    options
  )
}

/**
 * @param {import('@ucanto/interface').DID} account DID of the account that is receiving the upload.
 * @param {import('@ucanto/interface').Signer} signer Signing authority. Usually the user agent.
 * @param {import('./types').FileLike[]} files File data.
 * @param {UploadOptions} [options]
 */
export async function uploadDirectory(account, signer, files, options = {}) {
  return await uploadBlockStream(
    account,
    signer,
    UnixFS.createDirectoryEncoderStream(files),
    options
  )
}

/**
 * @param {import('@ucanto/interface').DID} account DID of the account that is receiving the upload.
 * @param {import('@ucanto/interface').Signer} signer Signing authority. Usually the user agent.
 * @param {ReadableStream<import('@ipld/unixfs').Block>} blocks UnixFS blocks.
 * @param {UploadOptions} [options]
 */
async function uploadBlockStream(account, signer, blocks, options = {}) {
  const onStoredShard = options.onStoredShard ?? (() => {})

  /** @type {import('./types').CARLink[]} */
  const shards = []
  /** @type {import('multiformats').Link<unknown, number, number, import('multiformats').Version>?} */
  let root = null
  await blocks
    .pipeThrough(new ShardingStream())
    .pipeThrough(new ShardStoringStream(account, signer, options))
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

  await Storage.registerUpload(account, signer, root, shards, options)
  return root
}

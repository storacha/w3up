/* eslint-env browser */
import fs from 'node:fs'
import { Readable } from 'node:stream'
import * as Link from 'multiformats/link'
import * as raw from 'multiformats/codecs/raw'
import { base58btc } from 'multiformats/bases/base58'
import * as Digest from 'multiformats/hashes/digest'
import { Piece } from '@web3-storage/data-segment'
import ora from 'ora'
import {
  getClient,
  uploadListResponseToString,
  filecoinInfoToString,
  parseCarLink,
  streamToBlob,
  blobListResponseToString,
} from './lib.js'

/**
 * @param {string} [blobPath]
 */
export async function blobAdd(blobPath) {
  const client = await getClient()

  const spinner = ora('Reading data').start()
  /** @type {Blob} */
  let blob
  try {
    blob = await streamToBlob(
      /** @type {ReadableStream<Uint8Array>} */
      (Readable.toWeb(blobPath ? fs.createReadStream(blobPath) : process.stdin))
    )
  } catch (/** @type {any} */ err) {
    spinner.fail(`Error: failed to read data: ${err.message}`)
    process.exit(1)
  }

  spinner.start('Storing')
  const { digest } = await client.capability.blob.add(blob, {
    receiptsEndpoint: client._receiptsEndpoint.toString(),
  })
  const cid = Link.create(raw.code, digest)
  spinner.stopAndPersist({
    symbol: '🐔',
    text: `Stored ${base58btc.encode(digest.bytes)} (${cid})`,
  })
}

/**
 * Print out all the blobs in the current space.
 *
 * @param {object} opts
 * @param {boolean} [opts.json]
 * @param {string} [opts.cursor]
 * @param {number} [opts.size]
 */
export async function blobList(opts = {}) {
  const client = await getClient()
  const listOptions = {}
  if (opts.size) {
    listOptions.size = parseInt(String(opts.size))
  }
  if (opts.cursor) {
    listOptions.cursor = opts.cursor
  }

  const spinner = ora('Listing Blobs').start()
  const res = await client.capability.blob.list(listOptions)
  spinner.stop()
  console.log(blobListResponseToString(res, opts))
}

/**
 * @param {string} digestStr
 */
export async function blobRemove(digestStr) {
  const spinner = ora(`Removing ${digestStr}`).start()
  let digest
  try {
    digest = Digest.decode(base58btc.decode(digestStr))
  } catch {
    spinner.fail(`Error: "${digestStr}" is not a base58btc encoded multihash`)
    process.exit(1)
  }
  const client = await getClient()
  try {
    await client.capability.blob.remove(digest)
    spinner.stopAndPersist({ symbol: '🐔', text: `Removed ${digestStr}` })
  } catch (/** @type {any} */ err) {
    spinner.fail(`Error: blob remove failed: ${err.message ?? err}`)
    console.error(err)
    process.exit(1)
  }
}

/**
 * @param {string} cidStr
 */
export async function indexAdd(cidStr) {
  const client = await getClient()

  const spinner = ora('Adding').start()
  const cid = parseCarLink(cidStr)
  if (!cid) {
    spinner.fail(`Error: "${cidStr}" is not a valid index CID`)
    process.exit(1)
  }
  await client.capability.index.add(cid)
  spinner.stopAndPersist({ symbol: '🐔', text: `Added index ${cid}` })
}

/**
 * @param {string} root
 * @param {string} shard
 * @param {object} opts
 * @param {string[]} opts._
 */
export async function uploadAdd(root, shard, opts) {
  const client = await getClient()

  let rootCID
  try {
    rootCID = Link.parse(root)
  } catch (/** @type {any} */ err) {
    console.error(`Error: failed to parse root CID: ${root}: ${err.message}`)
    process.exit(1)
  }

  /** @type {import('@storacha/client/types').CARLink[]} */
  const shards = []
  for (const str of [shard, ...opts._]) {
    try {
      shards.push(Link.parse(str))
    } catch (/** @type {any} */ err) {
      console.error(`Error: failed to parse shard CID: ${str}: ${err.message}`)
      process.exit(1)
    }
  }

  const spinner = ora('Adding upload').start()
  await client.capability.upload.add(rootCID, shards)
  spinner.stopAndPersist({ symbol: '🐔', text: `Upload added ${rootCID}` })
}

/**
 * Print out all the uploads in the current space.
 *
 * @param {object} opts
 * @param {boolean} [opts.json]
 * @param {boolean} [opts.shards]
 * @param {string} [opts.cursor]
 * @param {number} [opts.size]
 * @param {boolean} [opts.pre]
 */
export async function uploadList(opts = {}) {
  const client = await getClient()
  const listOptions = {}
  if (opts.size) {
    listOptions.size = parseInt(String(opts.size))
  }
  if (opts.cursor) {
    listOptions.cursor = opts.cursor
  }
  if (opts.pre) {
    listOptions.pre = opts.pre
  }

  const spinner = ora('Listing uploads').start()
  const res = await client.capability.upload.list(listOptions)
  spinner.stop()
  console.log(uploadListResponseToString(res, opts))
}

/**
 * Remove the upload from the upload list.
 *
 * @param {string} rootCid
 */
export async function uploadRemove(rootCid) {
  let root
  try {
    root = Link.parse(rootCid.trim())
  } catch (/** @type {any} */ err) {
    console.error(`Error: ${rootCid} is not a CID`)
    process.exit(1)
  }
  const client = await getClient()
  try {
    await client.capability.upload.remove(root)
  } catch (/** @type {any} */ err) {
    console.error(`Upload remove failed: ${err.message ?? err}`)
    console.error(err)
    process.exit(1)
  }
}

/**
 * Get filecoin information for given PieceCid.
 *
 * @param {string} pieceCid
 * @param {object} opts
 * @param {boolean} [opts.json]
 * @param {boolean} [opts.raw]
 */
export async function filecoinInfo(pieceCid, opts) {
  let pieceInfo
  try {
    pieceInfo = Piece.fromString(pieceCid)
  } catch (/** @type {any} */ err) {
    console.error(`Error: ${pieceCid} is not a Link`)
    process.exit(1)
  }
  const spinner = ora('Getting filecoin info').start()
  const client = await getClient()
  const info = await client.capability.filecoin.info(pieceInfo.link)
  if (info.out.error) {
    spinner.fail(
      `Error: failed to get filecoin info: ${info.out.error.message}`
    )
    process.exit(1)
  }
  spinner.stop()
  console.log(filecoinInfoToString(info.out.ok, opts))
}

import fs from 'node:fs'
import path from 'node:path'
// @ts-expect-error no typings :(
import tree from 'pretty-tree'
import { importDAG } from '@ucanto/core/delegation'
import { connect } from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import * as HTTP from '@ucanto/transport/http'
import * as Signer from '@ucanto/principal/ed25519'
import * as Link from 'multiformats/link'
import { base58btc } from 'multiformats/bases/base58'
import * as Digest from 'multiformats/hashes/digest'
import * as raw from 'multiformats/codecs/raw'
import { parse } from '@ipld/dag-ucan/did'
import * as dagJSON from '@ipld/dag-json'
import { create } from '@storacha/client'
import { StoreConf } from '@storacha/client/stores/conf'
import { CarReader } from '@ipld/car'

/**
 * @typedef {import('@storacha/client/types').AnyLink} AnyLink
 * @typedef {import('@storacha/client/types').CARLink} CARLink
 * @typedef {import('@storacha/client/types').FileLike & { size: number }} FileLike
 * @typedef {import('@storacha/client/types').SpaceBlobListSuccess} BlobListSuccess
 * @typedef {import('@storacha/client/types').UploadListSuccess} UploadListSuccess
 * @typedef {import('@storacha/capabilities/types').FilecoinInfoSuccess} FilecoinInfoSuccess
 */

/**
 *
 */
export function getPkg() {
  // @ts-ignore JSON.parse works with Buffer in Node.js
  return JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url)))
}

/** @param {string[]|string} paths */
export function checkPathsExist(paths) {
  paths = Array.isArray(paths) ? paths : [paths]
  for (const p of paths) {
    if (!fs.existsSync(p)) {
      console.error(`The path ${path.resolve(p)} does not exist`)
      process.exit(1)
    }
  }
  return paths
}

/** @param {number} bytes */
export function filesize(bytes) {
  if (bytes < 50) return `${bytes}B` // avoid 0.0KB
  if (bytes < 50000) return `${(bytes / 1000).toFixed(1)}KB` // avoid 0.0MB
  if (bytes < 50000000) return `${(bytes / 1000 / 1000).toFixed(1)}MB` // avoid 0.0GB
  return `${(bytes / 1000 / 1000 / 1000).toFixed(1)}GB`
}

/** @param {number} bytes */
export function filesizeMB(bytes) {
  return `${(bytes / 1000 / 1000).toFixed(1)}MB`
}

/** Get a configured w3up store used by the CLI. */
export function getStore() {
  return new StoreConf({
    profile: process.env.STORACHA_STORE_NAME ?? 'storacha-cli',
  })
}

/**
 * Get a new API client configured from env vars.
 */
export function getClient() {
  const store = getStore()

  const uploadServiceDID = process.env.STORACHA_SERVICE_DID
    ? parse(process.env.STORACHA_SERVICE_DID)
    : undefined
  const uploadServiceURL = process.env.STORACHA_SERVICE_URL
    ? new URL(process.env.STORACHA_SERVICE_URL)
    : undefined
  const receiptsEndpointString = process.env.STORACHA_RECEIPTS_URL
  let receiptsEndpoint
  if (receiptsEndpointString) {
    receiptsEndpoint = new URL(receiptsEndpointString)
  }

  let serviceConf
  if (uploadServiceDID && uploadServiceURL) {
    serviceConf =
      /** @type {import('@storacha/client/types').ServiceConf} */
      ({
        access: connect({
          id: uploadServiceDID,
          codec: CAR.outbound,
          channel: HTTP.open({ url: uploadServiceURL, method: 'POST' }),
        }),
        upload: connect({
          id: uploadServiceDID,
          codec: CAR.outbound,
          channel: HTTP.open({ url: uploadServiceURL, method: 'POST' }),
        }),
        filecoin: connect({
          id: uploadServiceDID,
          codec: CAR.outbound,
          channel: HTTP.open({ url: uploadServiceURL, method: 'POST' }),
        }),
      })
  }

  /** @type {import('@storacha/client/types').ClientFactoryOptions} */
  const createConfig = { store, serviceConf, receiptsEndpoint }

  const principal = process.env.STORACHA_PRINCIPAL
  if (principal) {
    createConfig.principal = Signer.parse(principal)
  }

  return create(createConfig)
}

/**
 * @param {string} path Path to the proof file.
 */
export async function readProof(path) {
  let bytes
  try {
    const buff = await fs.promises.readFile(path)
    bytes = new Uint8Array(buff.buffer)
  } catch (/** @type {any} */ err) {
    console.error(`Error: failed to read proof: ${err.message}`)
    process.exit(1)
  }
  return readProofFromBytes(bytes)
}

/**
 * @param {Uint8Array} bytes Path to the proof file.
 */
export async function readProofFromBytes(bytes) {
  const blocks = []
  try {
    const reader = await CarReader.fromBytes(bytes)
    for await (const block of reader.blocks()) {
      blocks.push(block)
    }
  } catch (/** @type {any} */ err) {
    console.error(`Error: failed to parse proof: ${err.message}`)
    process.exit(1)
  }
  try {
    // @ts-expect-error
    return importDAG(blocks)
  } catch (/** @type {any} */ err) {
    console.error(`Error: failed to import proof: ${err.message}`)
    process.exit(1)
  }
}

/**
 * @param {UploadListSuccess} res
 * @param {object} [opts]
 * @param {boolean} [opts.raw]
 * @param {boolean} [opts.json]
 * @param {boolean} [opts.shards]
 * @param {boolean} [opts.plainTree]
 * @returns {string}
 */
export function uploadListResponseToString(res, opts = {}) {
  if (opts.json) {
    return res.results
      .map(({ root, shards }) => dagJSON.stringify({ root, shards }))
      .join('\n')
  } else if (opts.shards) {
    return res.results
      .map(({ root, shards }) => {
        const treeBuilder = opts.plainTree ? tree.plain : tree
        return treeBuilder({
          label: root.toString(),
          nodes: [
            {
              label: 'shards',
              leaf: shards?.map((s) => s.toString()),
            },
          ],
        })
      })
      .join('\n')
  } else {
    return res.results.map(({ root }) => root.toString()).join('\n')
  }
}

/**
 * @param {BlobListSuccess} res
 * @param {object} [opts]
 * @param {boolean} [opts.raw]
 * @param {boolean} [opts.json]
 * @returns {string}
 */
export function blobListResponseToString(res, opts = {}) {
  if (opts.json) {
    return res.results.map(({ blob }) => dagJSON.stringify({ blob })).join('\n')
  } else {
    return res.results
      .map(({ blob }) => {
        const digest = Digest.decode(blob.digest)
        const cid = Link.create(raw.code, digest)
        return `${base58btc.encode(digest.bytes)} (${cid})`
      })
      .join('\n')
  }
}

/**
 * @param {FilecoinInfoSuccess} res
 * @param {object} [opts]
 * @param {boolean} [opts.raw]
 * @param {boolean} [opts.json]
 */
export function filecoinInfoToString(res, opts = {}) {
  if (opts.json) {
    return res.deals
      .map((deal) =>
        dagJSON.stringify({
          aggregate: deal.aggregate.toString(),
          provider: deal.provider,
          dealId: deal.aux.dataSource.dealID,
          inclusion: res.aggregates.find(
            (a) => a.aggregate.toString() === deal.aggregate.toString()
          )?.inclusion,
        })
      )
      .join('\n')
  } else {
    if (!res.deals.length) {
      return `
      Piece CID: ${res.piece.toString()}
      Deals: Piece being aggregated and offered for deal...
      `
    }
    // not showing inclusion proof as it would just be bytes
    return `
    Piece CID: ${res.piece.toString()}
    Deals: ${res.deals
      .map(
        (deal) => `
      Aggregate: ${deal.aggregate.toString()}
       Provider: ${deal.provider}
        Deal ID: ${deal.aux.dataSource.dealID}
    `
      )
      .join('')}
    `
  }
}

/**
 * Return validated CARLink or undefined
 *
 * @param {AnyLink} cid
 */
export function asCarLink(cid) {
  if (cid.version === 1 && cid.code === CAR.codec.code) {
    return /** @type {CARLink} */ (cid)
  }
}

/**
 * Return validated CARLink type or exit the process with an error code and message
 *
 * @param {string} cidStr
 */
export function parseCarLink(cidStr) {
  try {
    return asCarLink(Link.parse(cidStr.trim()))
  } catch {
    return undefined
  }
}

/** @param {string|number|Date} now */
const startOfMonth = (now) => {
  const d = new Date(now)
  d.setUTCDate(1)
  d.setUTCHours(0)
  d.setUTCMinutes(0)
  d.setUTCSeconds(0)
  d.setUTCMilliseconds(0)
  return d
}

/** @param {string|number|Date} now */
export const startOfLastMonth = (now) => {
  const d = startOfMonth(now)
  d.setUTCMonth(d.getUTCMonth() - 1)
  return d
}

/** @param {ReadableStream<Uint8Array>} source */
export const streamToBlob = async (source) => {
  const chunks = /** @type {Uint8Array[]} */ ([])
  await source.pipeTo(
    new WritableStream({
      write: (chunk) => {
        chunks.push(chunk)
      },
    })
  )
  return new Blob(chunks)
}

import { connect } from '@ucanto/client'
import { CAR, CBOR, HTTP } from '@ucanto/transport'
import { parse } from '@ipld/dag-ucan/did'
import { add as storeAdd } from '@web3-storage/access/capabilities/store'
import { add as uploadAdd } from '@web3-storage/access/capabilities/upload'
import retry, { AbortError } from 'p-retry'
import Queue from 'p-queue'

export * from './unixfs.js'
export * from './car.js'

// Production
const serviceURL = new URL('https://8609r1772a.execute-api.us-east-1.amazonaws.com')
const serviceDID = parse('did:key:z6MkrZ1r5XBFZjBU34qyD8fueMbMRkKw17BZaq2ivKFjnz2z')

const RETRIES = 3
const CONCURRENT_UPLOADS = 3

/** @typedef {import('./types').Abortable & import('./types').Retryable & import('./types').Connectable} RequestOptions */

/**
 * Upload multiple DAG shards (encoded as CAR files) to the service.
 *
 * Note: an "upload" must be registered in order to link multiple shards
 * together as a complete upload.
 *
 * The writeable side of this transform stream accepts CAR files and the
 * readable side yields `CARMetadata`.
 * 
 * @extends {TransformStream<import('./types').CARFile, import('./types').CARMetadata>}
 */
export class ShardStoringStream extends TransformStream {
  /**
   * @param {import('@ucanto/interface').DID} account DID of the account that is receiving the upload.
   * @param {import('@ucanto/interface').Signer} signer Signing authority. Usually the user agent.
   * @param {RequestOptions} [options]
   */
  constructor (account, signer, options = {}) {
    const queue = new Queue({ concurrency: CONCURRENT_UPLOADS })
    const abortController = new AbortController()
    super({
      async transform (car, controller) {
        void queue.add(async () => {
          try {
            const opts = { ...options, signal: abortController.signal }
            const cid = await storeDAG(account, signer, car, opts)
            const { version, roots } = car
            controller.enqueue({ version, roots, cid, size: car.size })
          } catch (err) {
            controller.error(err)
            abortController.abort(err)
          }
        }, { signal: abortController.signal })

        // retain backpressure by not returning until no items queued to be run
        await queue.onSizeLessThan(1)
      },
      async flush () {
        // wait for queue empty AND pending items complete
        await queue.onIdle()
      }
    })
  }
}

/**
 * Register an "upload" with the service.
 *
 * @param {import('@ucanto/interface').DID} account DID of the account that is receiving the upload.
 * @param {import('@ucanto/interface').Signer} signer Signing authority. Usually the user agent.
 * @param {import('multiformats/link').UnknownLink} root Root data CID for the DAG that was stored.
 * @param {import('./types').CARLink[]} shards CIDs of CAR files that contain the DAG.
 * @param {RequestOptions} [options]
 */
export async function registerUpload (account, signer, root, shards, options = {}) {
  /** @type {import('@ucanto/interface').ConnectionView<import('./types').Service>} */
  const conn = options.connection ?? connect({
    id: serviceDID,
    encoder: CAR,
    decoder: CBOR,
    channel: HTTP.open({
      url: serviceURL,
      method: 'POST'
    })
  })
  await retry(async () => {
    const result = await uploadAdd.invoke({
      issuer: signer,
      audience: serviceDID,
      with: account,
      nb: {
        // @ts-expect-error should allow v0 CIDs!
        root,
        shards
      }
    }).execute(conn)
    if (result?.error === true) throw result
  }, { onFailedAttempt: console.warn, retries: options.retries ?? RETRIES })
}

/**
 * Store a DAG encoded as a CAR file.
 *
 * @param {import('@ucanto/interface').DID} account DID of the account that is receiving the upload.
 * @param {import('@ucanto/interface').Signer} signer Signing authority. Usually the user agent.
 * @param {Blob} car CAR file data.
 * @param {RequestOptions} [options]
 * @returns {Promise<import('./types').CARLink>}
 */
export async function storeDAG (account, signer, car, options = {}) {
  // TODO: validate blob contains CAR data
  const bytes = new Uint8Array(await car.arrayBuffer())
  const link = await CAR.codec.link(bytes)
  /** @type {import('@ucanto/interface').ConnectionView<import('./types').Service>} */
  const conn = options.connection ?? connect({
    id: serviceDID,
    encoder: CAR,
    decoder: CBOR,
    channel: HTTP.open({
      url: serviceURL,
      method: 'POST'
    })
  })
  const result = await retry(async () => {
    const res = await storeAdd.invoke({
      issuer: signer,
      audience: serviceDID,
      with: account,
      nb: { link }
    }).execute(conn)
    return res
  }, { onFailedAttempt: console.warn, retries: options.retries ?? RETRIES })

  if (result.error != null) {
    throw new Error('failed store/add invocation', { cause: result })
  }

  // Return early if it was already uploaded.
  if (result.status === 'done') {
    return link
  }

  const res = await retry(async () => {
    try {
      const res = await fetch(result.url, {
        method: 'PUT',
        mode: 'cors',
        body: car,
        headers: result.headers,
        signal: options.signal
      })
      if (res.status >= 400 && res.status < 500) {
        throw new AbortError(`upload failed: ${res.status}`)
      }
      return res
    } catch (err) {
      if (options.signal?.aborted === true) {
        throw new AbortError('upload aborted')
      }
      throw err
    }
  }, { onFailedAttempt: console.warn, retries: options.retries ?? RETRIES })

  if (!res.ok) {
    throw new Error('upload failed')
  }

  return link
}

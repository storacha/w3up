import { Store as StoreCapabilities } from '@web3-storage/capabilities'
import { Base } from '../base.js'
import { CAR } from '@ucanto/transport'
import { SpaceDID } from '@web3-storage/capabilities/utils'
import retry, { AbortError } from 'p-retry'
import { servicePrincipal, connection } from './upload/service.js'
import { REQUEST_RETRIES } from './upload/constants.js'
import fetchPkg from 'ipfs-utils/src/http/fetch.js'
const { fetch } = fetchPkg

/**
 * Client for interacting with the `store/*` capabilities.
 */
export class StoreClient extends Base {
  /**
   * Store a DAG encoded as a CAR file.
   *
   * @param {Blob} car - CAR file data.
   * @param {import('../types.js').RequestOptions} [options]
   */
  async add(car, options = {}) {
    const conf = await this._invocationConfig([StoreCapabilities.add.can])
    options.connection = this._serviceConf.upload
    return add(conf, car, options)
  }

  /**
   * List CAR files stored to the resource.
   *
   * @param {import('../types.js').ListRequestOptions} [options]
   */
  async list(options = {}) {
    const conf = await this._invocationConfig([StoreCapabilities.add.can])
    options.connection = this._serviceConf.upload
    return list(conf, options)
  }

  /**
   * Remove a stored CAR file by CAR CID.
   *
   * @param {import('../types.js').CARLink} link - CID of CAR file to remove.
   * @param {import('../types.js').RequestOptions} [options]
   */
  async remove(link, options = {}) {
    const conf = await this._invocationConfig([StoreCapabilities.remove.can])
    options.connection = this._serviceConf.upload
    return remove(conf, link, options)
  }
}

/**
 *
 * @param {string} url
 * @param {import('./upload/types.js').ProgressFn} handler
 */
function createUploadProgressHandler(url, handler) {
  /**
   *
   * @param {import('./upload/types.js').ProgressStatus} status
   */
  function onUploadProgress({ total, loaded, lengthComputable }) {
    return handler({ total, loaded, lengthComputable, url })
  }
  return onUploadProgress
}

/**
 * Store a DAG encoded as a CAR file. The issuer needs the `store/add`
 * delegated capability.
 *
 * Required delegated capability proofs: `store/add`
 *
 * @param {import('./upload/types.js').InvocationConfig} conf Configuration
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
 * The issuer needs the `store/add` delegated capability.
 * @param {Blob|Uint8Array} car CAR file data.
 * @param {import('./upload/types.js').RequestOptions} [options]
 * @returns {Promise<import('./upload/types.js').CARLink>}
 */
export async function add(
  { issuer, with: resource, proofs, audience },
  car,
  options = {}
) {
  // TODO: validate blob contains CAR data
  const bytes =
    car instanceof Uint8Array ? car : new Uint8Array(await car.arrayBuffer())
  const link = await CAR.codec.link(bytes)
  /* c8 ignore next */
  const conn = options.connection ?? connection
  const result = await retry(
    async () => {
      return await StoreCapabilities.add
        .invoke({
          issuer,
          /* c8 ignore next */
          audience: audience ?? servicePrincipal,
          with: SpaceDID.from(resource),
          nb: { link, size: bytes.length },
          proofs,
        })
        .execute(conn)
    },
    {
      onFailedAttempt: console.warn,
      retries: options.retries ?? REQUEST_RETRIES,
    }
  )

  if (!result.out.ok) {
    throw new Error(`failed ${StoreCapabilities.add.can} invocation`, {
      cause: result.out.error,
    })
  }

  // Return early if it was already uploaded.
  if (result.out.ok.status === 'done') {
    return link
  }

  const responseAddUpload = result.out.ok

  const fetchWithUploadProgress =
    /** @type {(url: string, init?: import('./upload/types.js').FetchOptions) => Promise<Response>} */ (
      fetch
    )

  const res = await retry(
    async () => {
      try {
        const res = await fetchWithUploadProgress(responseAddUpload.url, {
          method: 'PUT',
          mode: 'cors',
          body: car,
          headers: responseAddUpload.headers,
          signal: options.signal,
          onUploadProgress: options.onUploadProgress
            ? createUploadProgressHandler(
                responseAddUpload.url,
                options.onUploadProgress
              )
            : undefined,
          // @ts-expect-error - this is needed by recent versions of node - see https://github.com/bluesky-social/atproto/pull/470 for more info
          duplex: 'half',
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
    },
    {
      retries: options.retries ?? REQUEST_RETRIES,
    }
  )

  if (!res.ok) {
    throw new Error(`upload failed: ${res.status}`)
  }

  return link
}

/**
 * List CAR files stored by the issuer.
 *
 * @param {import('./upload/types.js').InvocationConfig} conf Configuration
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
 * The issuer needs the `store/list` delegated capability.
 *
 * @param {import('./upload/types.js').ListRequestOptions} [options]
 * @returns {Promise<import('./upload/types.js').StoreListSuccess>}
 */
export async function list(
  { issuer, with: resource, proofs, audience },
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection
  const result = await StoreCapabilities.list
    .invoke({
      issuer,
      /* c8 ignore next */
      audience: audience ?? servicePrincipal,
      with: SpaceDID.from(resource),
      proofs,
      nb: {
        cursor: options.cursor,
        size: options.size,
        pre: options.pre,
      },
    })
    .execute(conn)

  if (!result.out.ok) {
    throw new Error(`failed ${StoreCapabilities.list.can} invocation`, {
      cause: result.out.error,
    })
  }

  return result.out.ok
}

/**
 * Remove a stored CAR file by CAR CID.
 *
 * @param {import('./upload/types.js').InvocationConfig} conf Configuration
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
 * The issuer needs the `store/remove` delegated capability.
 *
 * @param {import('./upload/types.js').CARLink} link CID of CAR file to remove.
 * @param {import('./upload/types.js').RequestOptions} [options]
 */
export async function remove(
  { issuer, with: resource, proofs, audience },
  link,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection
  const result = await StoreCapabilities.remove
    .invoke({
      issuer,
      /* c8 ignore next */
      audience: audience ?? servicePrincipal,
      with: SpaceDID.from(resource),
      nb: { link },
      proofs,
    })
    .execute(conn)

  if (!result.out.ok) {
    throw new Error(`failed ${StoreCapabilities.remove.can} invocation`, {
      cause: result.out.error,
    })
  }

  return result.out
}

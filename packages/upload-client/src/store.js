import { CAR } from '@ucanto/transport'
import * as StoreCapabilities from '@web3-storage/capabilities/store'
import retry, { AbortError } from 'p-retry'
import { servicePrincipal, connection } from './service.js'
import { REQUEST_RETRIES } from './constants.js'
import fetchPkg from 'ipfs-utils/src/http/fetch.js'
const { fetch } = fetchPkg

/**
 *
 * @param {string} url
 * @param {import('./types').ProgressFn} handler
 */
function createUploadProgressHandler(url, handler) {
  /**
   *
   * @param {import('./types').ProgressStatus} status
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
 * @param {import('./types').InvocationConfig} conf Configuration
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
 * @param {Blob} car CAR file data.
 * @param {import('./types').RequestOptions} [options]
 * @returns {Promise<import('./types').CARLink>}
 */
export async function add(
  { issuer, with: resource, proofs, audience },
  car,
  options = {}
) {
  // TODO: validate blob contains CAR data
  const bytes = new Uint8Array(await car.arrayBuffer())
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
          with: resource,
          nb: { link, size: car.size },
          proofs,
        })
        .execute(conn)
    },
    {
      onFailedAttempt: console.warn,
      retries: options.retries ?? REQUEST_RETRIES,
    }
  )

  if (result.error) {
    throw new Error(`failed ${StoreCapabilities.add.can} invocation`, {
      cause: result,
    })
  }

  // Return early if it was already uploaded.
  if (result.status === 'done') {
    return link
  }

  const fetchWithUploadProgress =
    /** @type {(url: string, init?: import('./types').FetchOptions) => Promise<Response>} */ (
      fetch
    )

  const res = await retry(
    async () => {
      try {
        const res = await fetchWithUploadProgress(result.url, {
          method: 'PUT',
          mode: 'cors',
          body: car,
          headers: result.headers,
          signal: options.signal,
          onUploadProgress: options.onUploadProgress
            ? createUploadProgressHandler(result.url, options.onUploadProgress)
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
      onFailedAttempt: console.warn,
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
 * @param {import('./types').InvocationConfig} conf Configuration
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
 * @param {import('./types').ListRequestOptions} [options]
 * @returns {Promise<import('./types').ListResponse<import('./types').StoreListResult>>}
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
      with: resource,
      proofs,
      nb: {
        cursor: options.cursor,
        size: options.size,
        pre: options.pre,
      },
    })
    .execute(conn)

  if (result.error) {
    throw new Error(`failed ${StoreCapabilities.list.can} invocation`, {
      cause: result,
    })
  }

  return result
}

/**
 * Remove a stored CAR file by CAR CID.
 *
 * @param {import('./types').InvocationConfig} conf Configuration
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
 * @param {import('./types').CARLink} link CID of CAR file to remove.
 * @param {import('./types').RequestOptions} [options]
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
      with: resource,
      nb: { link },
      proofs,
    })
    .execute(conn)

  if (result?.error) {
    throw new Error(`failed ${StoreCapabilities.remove.can} invocation`, {
      cause: result,
    })
  }
}

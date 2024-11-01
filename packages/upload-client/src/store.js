import { CAR } from '@ucanto/transport'
import * as StoreCapabilities from '@storacha/capabilities/store'
import { SpaceDID } from '@storacha/capabilities/utils'
import retry, { AbortError } from 'p-retry'
import { servicePrincipal, connection } from './service.js'
import { REQUEST_RETRIES } from './constants.js'

/**
 *
 * @param {string} url
 * @param {import('./types.js').ProgressFn} handler
 */
function createUploadProgressHandler(url, handler) {
  /**
   *
   * @param {import('./types.js').ProgressStatus} status
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
 * The issuer needs the `store/add` delegated capability.
 * @param {Blob|Uint8Array} car CAR file data.
 * @param {import('./types.js').RequestOptions} [options]
 * @returns {Promise<import('./types.js').CARLink>}
 */
export async function add(
  { issuer, with: resource, proofs, audience },
  car,
  options = {}
) {
  // TODO: validate blob contains CAR data
  /* c8 ignore next 2 */
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
          nonce: options.nonce,
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
    options.fetchWithUploadProgress ||
    options.fetch ||
    globalThis.fetch.bind(globalThis)

  let fetchDidCallUploadProgressCb = false
  const res = await retry(
    async () => {
      try {
        const res = await fetchWithUploadProgress(responseAddUpload.url, {
          method: 'PUT',
          body: car,
          headers: responseAddUpload.headers,
          signal: options.signal,
          onUploadProgress: (status) => {
            fetchDidCallUploadProgressCb = true
            if (options.onUploadProgress)
              createUploadProgressHandler(
                responseAddUpload.url,
                options.onUploadProgress
              )(status)
          },
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

  if (!fetchDidCallUploadProgressCb && options.onUploadProgress) {
    // the fetch implementation didn't support onUploadProgress
    const carBlob = new Blob([car])
    options.onUploadProgress({
      total: carBlob.size,
      loaded: carBlob.size,
      lengthComputable: false,
    })
  }

  if (!res.ok) {
    throw new Error(`upload failed: ${res.status}`)
  }

  return link
}

/**
 * Get details of a stored item.
 *
 * Required delegated capability proofs: `store/get`
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
 * The issuer needs the `store/get` delegated capability.
 * @param {import('multiformats/link').Link<unknown, CAR.codec.code>} link CID of stored CAR file.
 * @param {import('./types.js').RequestOptions} [options]
 * @returns {Promise<import('./types.js').StoreGetSuccess>}
 */
export async function get(
  { issuer, with: resource, proofs, audience },
  link,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection
  const result = await retry(
    async () => {
      return await StoreCapabilities.get
        .invoke({
          issuer,
          /* c8 ignore next */
          audience: audience ?? servicePrincipal,
          with: SpaceDID.from(resource),
          nb: { link },
          proofs,
          nonce: options.nonce,
        })
        .execute(conn)
    },
    {
      onFailedAttempt: console.warn,
      retries: options.retries ?? REQUEST_RETRIES,
    }
  )

  if (!result.out.ok) {
    throw new Error(`failed ${StoreCapabilities.get.can} invocation`, {
      cause: result.out.error,
    })
  }

  return result.out.ok
}

/**
 * List CAR files stored by the issuer.
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
 * The issuer needs the `store/list` delegated capability.
 * @param {import('./types.js').ListRequestOptions} [options]
 * @returns {Promise<import('./types.js').StoreListSuccess>}
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
      nonce: options.nonce,
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
 * The issuer needs the `store/remove` delegated capability.
 * @param {import('./types.js').CARLink} link CID of CAR file to remove.
 * @param {import('./types.js').RequestOptions} [options]
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
      nonce: options.nonce,
    })
    .execute(conn)

  if (!result.out.ok) {
    throw new Error(`failed ${StoreCapabilities.remove.can} invocation`, {
      cause: result.out.error,
    })
  }

  return result.out
}

import { CAR } from '@ucanto/transport'
import * as BlobCapabilities from '@web3-storage/capabilities/blob'
import { SpaceDID } from '@web3-storage/capabilities/utils'
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
 * Store a DAG encoded as a CAR file. The issuer needs the `blob/add`
 * delegated capability.
 *
 * Required delegated capability proofs: `blob/add`
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
 * The issuer needs the `blob/add` delegated capability.
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
  const bytes =
    car instanceof Uint8Array ? car : new Uint8Array(await car.arrayBuffer())
  const link = await CAR.codec.link(bytes)
  /* c8 ignore next */
  const conn = options.connection ?? connection
  const result = await retry(
    async () => {
      return await BlobCapabilities.add
        .invoke({
          issuer,
          /* c8 ignore next */
          audience: audience ?? servicePrincipal,
          with: SpaceDID.from(resource),
          nb: { blob: { digest: link.multihash.bytes, size: bytes.length } },
          proofs,
        })
        // @ts-ignore
        .execute(conn)
    },
    {
      onFailedAttempt: console.warn,
      retries: options.retries ?? REQUEST_RETRIES,
    }
  )

  if (!result.out.ok) {
    throw new Error(`failed ${BlobCapabilities.add.can} invocation`, {
      cause: result.out.error,
    })
  }

  // TODO I'm definitely missing something here
  // I suppose it's something alike https://github.com/w3s-project/w3up/pull/1421/files#diff-f1d31e4f2617054f785fab0c186ab965b2fdd3a9ed7873a955d3e3c74bb6e186R100
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

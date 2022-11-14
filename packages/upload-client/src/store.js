import { CAR } from '@ucanto/transport'
import * as StoreCapabilities from '@web3-storage/access/capabilities/store'
import retry, { AbortError } from 'p-retry'
import { serviceDID, connection } from './service.js'
import { findCapability } from './utils.js'
import { REQUEST_RETRIES } from './constants.js'

/**
 * Store a DAG encoded as a CAR file. The issuer needs the `store/add`
 * delegated capability.
 *
 * Required delegated capability proofs: `store/add`
 *
 * @param {import('./types').InvocationConfig} invocationConfig Configuration
 * for the UCAN invocation. An object with `issuer` and `proofs`.
 *
 * The `issuer` is the signing authority that is issuing the UCAN
 * invocation(s). It is typically the user _agent_.
 *
 * The `proofs` are a set of capability delegations that prove the issuer
 * has the capability to perform the action.
 *
 * The issuer needs the `store/add` delegated capability.
 * @param {Blob} car CAR file data.
 * @param {import('./types').RequestOptions} [options]
 * @returns {Promise<import('./types').CARLink>}
 */
export async function add({ issuer, proofs }, car, options = {}) {
  const capability = findCapability(proofs, StoreCapabilities.add.can)
  // TODO: validate blob contains CAR data
  const bytes = new Uint8Array(await car.arrayBuffer())
  const link = await CAR.codec.link(bytes)
  const conn = options.connection ?? connection
  const result = await retry(
    async () => {
      const res = await StoreCapabilities.add
        .invoke({
          issuer,
          audience: serviceDID,
          // @ts-expect-error expects did:${string} but cap with is ${string}:${string}
          with: capability.with,
          nb: { link },
          proofs,
        })
        .execute(conn)
      return res
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

  const res = await retry(
    async () => {
      try {
        const res = await fetch(result.url, {
          method: 'PUT',
          mode: 'cors',
          body: car,
          headers: result.headers,
          signal: options.signal,
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
    throw new Error('store failed')
  }

  return link
}

/**
 * List CAR files stored by the issuer.
 *
 * @param {import('./types').InvocationConfig} invocationConfig Configuration
 * for the UCAN invocation. An object with `issuer` and `proofs`.
 *
 * The `issuer` is the signing authority that is issuing the UCAN
 * invocation(s). It is typically the user _agent_.
 *
 * The `proofs` are a set of capability delegations that prove the issuer
 * has the capability to perform the action.
 *
 * The issuer needs the `store/list` delegated capability.
 * @param {import('./types').RequestOptions} [options]
 */
export async function list({ issuer, proofs }, options = {}) {
  const capability = findCapability(proofs, StoreCapabilities.list.can)
  const conn = options.connection ?? connection

  const result = await StoreCapabilities.list
    .invoke({
      issuer,
      audience: serviceDID,
      // @ts-expect-error expects did:${string} but cap with is ${string}:${string}
      with: capability.with,
    })
    .execute(conn)
  if (result.error === true) throw result

  return result
}

/**
 * Remove a stored CAR file by CAR CID.
 *
 * @param {import('./types').InvocationConfig} invocationConfig Configuration
 * for the UCAN invocation. An object with `issuer` and `proofs`.
 *
 * The `issuer` is the signing authority that is issuing the UCAN
 * invocation(s). It is typically the user _agent_.
 *
 * The `proofs` are a set of capability delegations that prove the issuer
 * has the capability to perform the action.
 *
 * The issuer needs the `store/remove` delegated capability.
 * @param {import('./types').CARLink} link CID of CAR file to remove.
 * @param {import('./types').RequestOptions} [options]
 */
export async function remove({ issuer, proofs }, link, options = {}) {
  const capability = findCapability(proofs, StoreCapabilities.remove.can)
  const conn = options.connection ?? connection

  const result = await StoreCapabilities.remove
    .invoke({
      issuer,
      audience: serviceDID,
      // @ts-expect-error expects did:${string} but cap with is ${string}:${string}
      with: capability.with,
      nb: { link },
    })
    .execute(conn)
  if (result?.error === true) throw result
}

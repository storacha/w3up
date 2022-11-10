import { isDelegation } from '@ucanto/core'
import { connect } from '@ucanto/client'
import { CAR, CBOR, HTTP } from '@ucanto/transport'
import * as DID from '@ipld/dag-ucan/did'
import { add as storeAdd } from '@web3-storage/access/capabilities/store'
import { add as uploadAdd } from '@web3-storage/access/capabilities/upload'
import retry, { AbortError } from 'p-retry'

// Production
const serviceURL = new URL(
  'https://8609r1772a.execute-api.us-east-1.amazonaws.com'
)
const serviceDID = DID.parse(
  'did:key:z6MkrZ1r5XBFZjBU34qyD8fueMbMRkKw17BZaq2ivKFjnz2z'
)

const RETRIES = 3

const connection = connect({
  id: serviceDID,
  encoder: CAR,
  decoder: CBOR,
  channel: HTTP.open({
    url: serviceURL,
    method: 'POST',
  }),
})

/**
 * Register an "upload" with the service.
 *
 * @param {import('@ucanto/interface').Signer} issuer Signing authority that is
 * issuing the UCAN invocations. Typically the user _agent_.
 * @param {import('@ucanto/interface').Proof[]} proofs Proof(s) the issuer
 * has the capability to perform the action. At minimum the issuer needs the
 * `upload/add` delegated capability.
 * @param {import('multiformats/link').UnknownLink} root Root data CID for the DAG that was stored.
 * @param {import('./types').CARLink[]} shards CIDs of CAR files that contain the DAG.
 * @param {import('./types').RequestOptions} [options]
 */
export async function registerUpload(
  issuer,
  proofs,
  root,
  shards,
  options = {}
) {
  const capability = findCapability(proofs, serviceDID.did(), uploadAdd.can)
  /** @type {import('@ucanto/interface').ConnectionView<import('./types').Service>} */
  const conn = options.connection ?? connection
  await retry(
    async () => {
      const result = await uploadAdd
        .invoke({
          issuer,
          audience: serviceDID,
          // @ts-expect-error expects did:${string} but cap with is ${string}:${string}
          with: capability.with,
          nb: {
            root,
            shards,
          },
        })
        .execute(conn)
      if (result?.error === true) throw result
    },
    { onFailedAttempt: console.warn, retries: options.retries ?? RETRIES }
  )
}

/**
 * Store a DAG encoded as a CAR file.
 *
 * @param {import('@ucanto/interface').Signer} issuer Signing authority that
 * is issuing the UCAN invocations. Typically the user _agent_.
 * @param {import('@ucanto/interface').Proof[]} proofs Proof(s) the
 * issuer has the capability to perform the action. At minimum the issuer
 * needs the `store/add` delegated capability.
 * @param {Blob} car CAR file data.
 * @param {import('./types').RequestOptions} [options]
 * @returns {Promise<import('./types').CARLink>}
 */
export async function store(issuer, proofs, car, options = {}) {
  const capability = findCapability(proofs, serviceDID.did(), storeAdd.can)
  // TODO: validate blob contains CAR data
  const bytes = new Uint8Array(await car.arrayBuffer())
  const link = await CAR.codec.link(bytes)
  /** @type {import('@ucanto/interface').ConnectionView<import('./types').Service>} */
  const conn = options.connection ?? connection
  const result = await retry(
    async () => {
      const res = await storeAdd
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
    { onFailedAttempt: console.warn, retries: options.retries ?? RETRIES }
  )

  if (result.error) {
    throw new Error(`failed ${storeAdd.can} invocation`, { cause: result })
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
    { onFailedAttempt: console.warn, retries: options.retries ?? RETRIES }
  )

  if (!res.ok) {
    throw new Error('upload failed')
  }

  return link
}

/**
 * @param {import('@ucanto/interface').Proof[]} proofs
 * @param {import('@ucanto/interface').DID} audience
 * @param {import('@ucanto/interface').Ability} ability
 */
function findCapability(proofs, audience, ability) {
  let capability
  for (const proof of proofs) {
    if (!isDelegation(proof)) continue
    if (proof.audience.did() !== audience) continue
    capability = proof.capabilities.find((c) =>
      capabilityMatches(c.can, ability)
    )
    if (capability) break
  }
  if (!capability) {
    throw new Error(
      `Missing proof of delegated capability "${
        uploadAdd.can
      }" for audience "${serviceDID.did()}"`
    )
  }
  return capability
}

/**
 * @param {string} can
 * @param {import('@ucanto/interface').Ability} ability
 */
function capabilityMatches(can, ability) {
  return can === ability
    ? true
    : can.endsWith('*') && ability.startsWith(can.split('*')[0])
}

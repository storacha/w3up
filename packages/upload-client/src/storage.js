import { isDelegation } from '@ucanto/core'
import { connect } from '@ucanto/client'
import { CAR, CBOR, HTTP } from '@ucanto/transport'
import { parse } from '@ipld/dag-ucan/did'
import { add as storeAdd } from '@web3-storage/access/capabilities/store'
import { add as uploadAdd } from '@web3-storage/access/capabilities/upload'
import retry, { AbortError } from 'p-retry'

// Production
const serviceURL = new URL(
  'https://8609r1772a.execute-api.us-east-1.amazonaws.com'
)
const serviceDID = parse(
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
 * @param {import('@ucanto/interface').Signer} issuer Signing authority. Usually the user agent.
 * @param {import('@ucanto/interface').Proof} proof Proof the signer has the capability to perform the action.
 * @param {import('multiformats/link').UnknownLink} root Root data CID for the DAG that was stored.
 * @param {import('./types').CARLink[]} shards CIDs of CAR files that contain the DAG.
 * @param {import('./types').RequestOptions} [options]
 */
export async function registerUpload(
  issuer,
  proof,
  root,
  shards,
  options = {}
) {
  validateProof(proof, serviceDID.did(), uploadAdd.can)

  /** @type {import('@ucanto/interface').ConnectionView<import('./types').Service>} */
  const conn = options.connection ?? connection
  await retry(
    async () => {
      const result = await uploadAdd
        .invoke({
          issuer,
          audience: serviceDID,
          // @ts-ignore expects did:${string} but cap with is ${string}:${string}
          with: proof.capabilities[0].with,
          nb: {
            // @ts-expect-error should allow v0 CIDs!
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
 * @param {import('@ucanto/interface').Signer} issuer Signing authority. Usually the user agent.
 * @param {import('@ucanto/interface').Proof} proof Proof the signer has the capability to perform the action.
 * @param {Blob} car CAR file data.
 * @param {import('./types').RequestOptions} [options]
 * @returns {Promise<import('./types').CARLink>}
 */
export async function store(issuer, proof, car, options = {}) {
  validateProof(proof, serviceDID.did(), storeAdd.can)

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
          // @ts-ignore expects did:${string} but cap with is ${string}:${string}
          with: proof.capabilities[0].with,
          nb: { link },
          proofs: [proof],
        })
        .execute(conn)
      return res
    },
    { onFailedAttempt: console.warn, retries: options.retries ?? RETRIES }
  )

  if (result.error != null) {
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
 * @param {import('@ucanto/interface').Proof} proof
 * @param {import('@ucanto/interface').DID} audience
 * @param {import('@ucanto/interface').Ability} ability
 */
function validateProof(proof, audience, ability) {
  if (!isDelegation(proof)) {
    throw new Error('Linked proofs not supported')
  }
  if (proof.audience.did() !== audience) {
    throw new Error(`Unexpected audience: ${proof.audience}`)
  }
  if (!proof.capabilities.some((c) => capabilityMatches(c.can, ability))) {
    throw new Error(`Missing proof of delegated capability: ${ability}`)
  }
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

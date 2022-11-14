import { add as uploadAdd } from '@web3-storage/access/capabilities/upload'
import retry from 'p-retry'
import { serviceDID, connection } from './service.js'
import { findCapability } from './utils.js'
import { REQUEST_RETRIES } from './constants.js'

/**
 * Register an "upload" with the service. The issuer needs the `upload/add`
 * delegated capability.
 *
 * Required delegated capability proofs: `upload/add`
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
 * The issuer needs the `upload/add` delegated capability.
 * @param {import('multiformats/link').UnknownLink} root Root data CID for the DAG that was stored.
 * @param {import('./types').CARLink[]} shards CIDs of CAR files that contain the DAG.
 * @param {import('./types').RequestOptions} [options]
 */
export async function add({ issuer, proofs }, root, shards, options = {}) {
  const capability = findCapability(proofs, uploadAdd.can)
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
    {
      onFailedAttempt: console.warn,
      retries: options.retries ?? REQUEST_RETRIES,
    }
  )
}

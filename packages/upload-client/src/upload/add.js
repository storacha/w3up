import * as UploadCapabilities from '@web3-storage/capabilities/upload'
import { SpaceDID } from '@web3-storage/capabilities/utils'
import retry from 'p-retry'
import { servicePrincipal, connection } from '../service.js'
import { REQUEST_RETRIES } from '../constants.js'

/**
 * Register an "upload" with the service. The issuer needs the `upload/add`
 * delegated capability.
 *
 * Required delegated capability proofs: `upload/add`
 *
 * @param {import('../types.js').InvocationConfig} conf Configuration
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
 * The issuer needs the `upload/add` delegated capability.
 * @param {import('multiformats/link').UnknownLink} root Root data CID for the DAG that was stored.
 * @param {import('../types.js').CARLink[]} shards CIDs of CAR files that contain the DAG.
 * @param {import('../types.js').RequestOptions} [options]
 * @returns {Promise<import('../types.js').UploadAddSuccess>}
 */
export async function add(
  { issuer, with: resource, proofs, audience },
  root,
  shards,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection
  const result = await retry(
    async () => {
      return await UploadCapabilities.add
        .invoke({
          issuer,
          /* c8 ignore next */
          audience: audience ?? servicePrincipal,
          with: SpaceDID.from(resource),
          nb: input(root, shards),
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
    throw new Error(`failed ${UploadCapabilities.add.can} invocation`, {
      cause: result.out.error,
    })
  }

  return result.out.ok
}

/** Returns the ability used by an invocation. */
export const ability = UploadCapabilities.add.can

/**
 * Returns required input to the invocation.
 *
 * @param {import('multiformats/link').UnknownLink} root
 * @param {import('../types.js').CARLink[]} shards
 */
export const input = (root, shards) => ({ root, shards })

import * as UploadCapabilities from '@web3-storage/capabilities/upload'
import { SpaceDID } from '@web3-storage/capabilities/utils'
import retry from 'p-retry'
import { servicePrincipal, connection } from '../service.js'
import { REQUEST_RETRIES } from '../constants.js'

/**
 * Get details of an "upload".
 *
 * Required delegated capability proofs: `upload/get`
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
 * The issuer needs the `upload/get` delegated capability.
 * @param {import('multiformats/link').UnknownLink} root Root data CID for the DAG that was stored.
 * @param {import('../types.js').RequestOptions} [options]
 * @returns {Promise<import('../types.js').UploadGetSuccess>}
 */
export async function get(
  { issuer, with: resource, proofs, audience },
  root,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection
  const result = await retry(
    async () => {
      return await UploadCapabilities.get
        .invoke({
          issuer,
          /* c8 ignore next */
          audience: audience ?? servicePrincipal,
          with: SpaceDID.from(resource),
          nb: input(root),
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
    throw new Error(`failed ${UploadCapabilities.get.can} invocation`, {
      cause: result.out.error,
    })
  }

  return result.out.ok
}

/** Returns the ability used by an invocation. */
export const ability = UploadCapabilities.get.can

/**
 * Returns required input to the invocation.
 *
 * @param {import('multiformats/link').UnknownLink} root
 */
export const input = (root) => ({ root })

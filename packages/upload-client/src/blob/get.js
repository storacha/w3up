import * as BlobCapabilities from '@web3-storage/capabilities/blob'
import { SpaceDID } from '@web3-storage/capabilities/utils'
import { servicePrincipal, connection } from '../service.js'

/**
 * Gets a stored Blob file by digest.
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
 * The issuer needs the `blob/get/0/1` delegated capability.
 * @param {import('multiformats').MultihashDigest} multihash of the blob
 * @param {import('../types.js').RequestOptions} [options]
 */
export async function get(
  { issuer, with: resource, proofs, audience },
  multihash,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection
  const result = await BlobCapabilities.get
    .invoke({
      issuer,
      /* c8 ignore next */
      audience: audience ?? servicePrincipal,
      with: SpaceDID.from(resource),
      nb: input(multihash),
      proofs,
      nonce: options.nonce,
    })
    .execute(conn)

  if (!result.out.ok) {
    throw new Error(`failed ${BlobCapabilities.get.can} invocation`, {
      cause: result.out.error,
    })
  }

  return result.out
}

/** Returns the ability used by an invocation. */
export const ability = BlobCapabilities.get.can

/**
 * Returns required input to the invocation.
 *
 * @param {import('multiformats').MultihashDigest} digest
 */
export const input = (digest) => ({ digest: digest.bytes })

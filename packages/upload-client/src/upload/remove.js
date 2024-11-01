import * as UploadCapabilities from '@storacha/capabilities/upload'
import { SpaceDID } from '@storacha/capabilities/utils'
import { servicePrincipal, connection } from '../service.js'

/**
 * Remove an upload by root data CID.
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
 * The issuer needs the `upload/remove` delegated capability.
 * @param {import('multiformats').UnknownLink} root Root data CID to remove.
 * @param {import('../types.js').RequestOptions} [options]
 */
export async function remove(
  { issuer, with: resource, proofs, audience },
  root,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection
  const result = await UploadCapabilities.remove
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

  if (!result.out.ok) {
    throw new Error(`failed ${UploadCapabilities.remove.can} invocation`, {
      cause: result.out.error,
    })
  }

  return result.out.ok
}

/** Returns the ability used by an invocation. */
export const ability = UploadCapabilities.remove.can

/**
 * Returns required input to the invocation.
 *
 * @param {import('multiformats').UnknownLink} root
 */
export const input = (root) => ({ root })

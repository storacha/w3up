import * as UploadCapabilities from '@web3-storage/capabilities/upload'
import { SpaceDID } from '@web3-storage/capabilities/utils'
import { servicePrincipal, connection } from '../service.js'

/**
 * List uploads created by the issuer.
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
 * The issuer needs the `upload/list` delegated capability.
 * @param {import('../types.js').ListRequestOptions} [options]
 * @returns {Promise<import('../types.js').UploadListSuccess>}
 */
export async function list(
  { issuer, with: resource, proofs, audience },
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection

  const result = await UploadCapabilities.list
    .invoke({
      issuer,
      /* c8 ignore next */
      audience: audience ?? servicePrincipal,
      with: SpaceDID.from(resource),
      proofs,
      nb: input(options.cursor, options.size, options.pre),
      nonce: options.nonce,
    })
    .execute(conn)

  if (!result.out.ok) {
    throw new Error(`failed ${UploadCapabilities.list.can} invocation`, {
      cause: result.out.error,
    })
  }

  return result.out.ok
}

/** Returns the ability used by an invocation. */
export const ability = UploadCapabilities.list.can

/**
 * Returns required input to the invocation.
 *
 * @param {string} [cursor]
 * @param {number} [size]
 * @param {boolean} [pre]
 */
export const input = (cursor, size, pre) => ({ cursor, size, pre })

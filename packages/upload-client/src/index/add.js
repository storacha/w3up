import * as IndexCapabilities from '@storacha/capabilities/index'
import { SpaceDID } from '@storacha/capabilities/utils'
import retry from 'p-retry'
import { servicePrincipal, connection } from '../service.js'
import { REQUEST_RETRIES } from '../constants.js'

/**
 * Register an "index" with the service. The issuer needs the `index/add`
 * delegated capability.
 *
 * Required delegated capability proofs: `index/add`
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
 * The issuer needs the `index/add` delegated capability.
 * @param {import('../types.js').CARLink} index Index to store.
 * @param {import('../types.js').RequestOptions} [options]
 * @returns {Promise<import('../types.js').IndexAddSuccess>}
 */
export async function add(
  { issuer, with: resource, proofs, audience },
  index,
  options = {}
) {
  /* c8 ignore next */
  const conn = options.connection ?? connection
  const result = await retry(
    async () => {
      return await IndexCapabilities.add
        .invoke({
          issuer,
          /* c8 ignore next */
          audience: audience ?? servicePrincipal,
          with: SpaceDID.from(resource),
          nb: input(index),
          proofs,
        })
        .execute(conn)
    },
    {
      onFailedAttempt: console.warn,
      retries: options.retries ?? REQUEST_RETRIES,
    }
  )

  if (!result.out.ok) {
    throw new Error(`failed ${IndexCapabilities.add.can} invocation`, {
      cause: result.out.error,
    })
  }

  return result.out.ok
}

/** Returns the ability used by an invocation. */
export const ability = IndexCapabilities.add.can

/**
 * Returns required input to the invocation.
 *
 * @param {import('../types.js').CARLink} index
 */
export const input = (index) => ({ index })

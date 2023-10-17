import * as API from '../types.js'
import { Revoked } from '@ucanto/validator'

/**
 * @param {API.RevocationServiceContext} context
 */
export const create = (context) => ({
  validateAuthorization: validateAuthorization.bind(null, context),
})

/**
 * Verifies that no UCAN in the provided invocation authorization has been
 * revoked. If any of the UCANs have been revoked it returns a
 * `Revoked` error.
 *
 * @param {API.RevocationServiceContext} context
 * @param {API.Authorization} auth
 * @returns {Promise<API.Result<{}, API.Revoked>>}
 */
export const validateAuthorization = async ({ revocationsStorage }, auth) => {
  // Compute map of UCANs to principals with revocation authority.
  const query = toRevocationQuery(auth)
  // Fetch all the revocations for all the UCANs in the authorization chain.
  const match = await revocationsStorage.query(query)

  // If query failed we also fail the verification. TODO: Define other error
  // types because here we do not know if the UCAN has been revoked or not.
  if (match.error) {
    return { error: new Revoked(auth.delegation) }
  }

  // Now we go through each revocation and check if revocation issuer has
  // an authority to revoke the UCAN. If so we fail, otherwise we continue.
  for (const [ucan, scope = {}] of Object.entries(match.ok)) {
    for (const principal of /** @type {API.DID[]} */ (Object.keys(scope))) {
      const delegation = query[ucan]?.[principal]
      if (delegation) {
        return { error: new Revoked(delegation) }
      }
    }
  }

  // If no relevant revocation has been found we succeed the verification.
  return { ok: {} }
}

/**
 * Derives revocation query for the given authorization chain. Returned query
 * is a mapping between delegation CID to map of principals with an authority
 * to revoke it.
 *
 * @param {API.Authorization} authorization
 * @returns {Record<string, Record<API.DID, API.Delegation>>}
 */

export const toRevocationQuery = ({ delegation, proofs }) => {
  // Delegation issuer and audience principals have revocation authority.
  const scope = {
    [delegation.issuer.did()]: delegation,
    [delegation.audience.did()]: delegation,
  }

  const query = {
    [delegation.cid.toString()]: scope,
  }

  // All the principals upstream are also authorized to revoke delegations
  // downstream, there for we are going to compute queries for each parent
  // proof and copy their principals into this scope. We are also going to
  // copy all the CIDs from the parent queries into this query.
  for (const proof of proofs) {
    const parent = toRevocationQuery(proof)
    Object.assign(query, parent)
    Object.assign(scope, parent[proof.delegation.cid.toString()])
  }

  return query
}

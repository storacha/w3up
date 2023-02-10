import * as Server from '@ucanto/server'
import { delegate } from '@web3-storage/capabilities/access'
import * as Ucanto from '@ucanto/interface'
import { createDelegationsStorage } from './delegations.js'

/**
 * @typedef {{}} AccessDelegateSuccess
 * @typedef {{ error: true }} AccessDelegateFailure
 * @typedef {Ucanto.Result<AccessDelegateSuccess, AccessDelegateFailure>} AccessDelegateResult
 */

/**
 * @param {import('../bindings').RouteContext} ctx
 */
export function accessDelegateProvider(ctx) {
  return Server.provide(delegate, async ({ capability, invocation }) => {
    return {}
  })
}

/**
 * @callback AccessDelegateHandler
 * @param {Ucanto.Invocation<import('@web3-storage/capabilities/types').AccessDelegate>} invocation
 * @returns {Promise<AccessDelegateResult>}
 */

/**
 * @param {object} options
 * @param {import('../types/delegations').DelegationsStorage} [options.delegations]
 * @returns {AccessDelegateHandler}
 */
export function createAccessDelegateHandler({
  delegations = createDelegationsStorage(),
} = {}) {
  return async (invocation) => {
    const delegated = extractProvenDelegations(invocation)
    delegations.push(...delegated)
    return {}
  }
}

/**
 * @param {Ucanto.Invocation<import('@web3-storage/capabilities/types').AccessDelegate>} invocation
 * @returns {Iterable<Ucanto.Delegation<Ucanto.Capabilities>>}
 */
function* extractProvenDelegations({ proofs, capabilities }) {
  const nbDelegations = new Set(Object.values(capabilities[0].nb.delegations))
  const proofDelegations = proofs.flatMap((proof) =>
    'capabilities' in proof ? [proof] : []
  )
  if (nbDelegations.size > proofDelegations.length) {
    throw new Error(
      `UnknownDelegation: nb.delegations has more delegations than proofs`
    )
  }
  for (const delegationLink of nbDelegations) {
    // @todo avoid O(m*n) check here, but not obvious how while also using full Link#equals logic
    // (could be O(minimum(m,n)) if comparing CID as strings, but that might ignore same link diff multibase)
    const delegationProof = proofDelegations.find((p) =>
      delegationLink.equals(p.cid)
    )
    if (!delegationProof) {
      throw new Error(
        `UnknownDelegation: missing proof for delegation cid ${delegationLink}`
      )
    }
    yield delegationProof
  }
}

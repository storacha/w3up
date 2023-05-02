import * as Server from '@ucanto/server'
import * as Access from '@web3-storage/capabilities/access'
import * as API from '../api.js'
import * as Allocator from './space-allocate.js'

/**
 * @param {Context} ctx
 */
export const provide = (ctx) =>
  Server.provide(Access.delegate, (input) => delegate(input, ctx))

/**
 * @typedef {Allocator.Context & {
 * models: {delegations: import('../types/delegations').DelegationsStorage}
 * }} Context
 */

/**
 * @param {API.Input<Access.delegate>} input
 * @param {Context} context
 * @returns {Promise<API.Result<API.AccessDelegateSuccess, API.AccessDelegateFailure>>}
 */
export const delegate = async ({ capability, invocation }, context) => {
  const delegated = extractProvenDelegations(capability, invocation.proofs)
  if (delegated.error) {
    return delegated
  }
  const size = delegated.ok.reduce(
    (total, proof) => total + proof.root.bytes.byteLength,
    0
  )

  const result = await Allocator.allocate(
    {
      capability: {
        with: capability.with,
        nb: { size },
      },
    },
    context
  )

  if (result.ok) {
    await context.models.delegations.putMany(...delegated.ok)
    return { ok: {} }
  } else {
    return result
  }
}

/**
 * @param {API.InferInvokedCapability<typeof Access.delegate>} capability
 * @param {API.Proof[]} proofs
 * @returns {API.Result<API.Delegation<API.Capabilities>[], API.DelegationNotFound>}
 */
const extractProvenDelegations = (capability, proofs) => {
  const nbDelegations = new Set(Object.values(capability.nb.delegations))
  const proofDelegations = proofs.flatMap((proof) =>
    'capabilities' in proof ? [proof] : []
  )

  if (nbDelegations.size > proofDelegations.length) {
    return {
      error: new DelegationNotFound(
        `nb.delegations has more delegations than proofs`
      ),
    }
  }

  const delegations = []
  for (const delegationLink of nbDelegations) {
    // @todo avoid O(m*n) check here, but not obvious how while also using full Link#equals logic
    // (could be O(minimum(m,n)) if comparing CID as strings, but that might ignore same link diff multibase)
    const delegationProof = proofDelegations.find((p) =>
      delegationLink.equals(p.cid)
    )

    if (!delegationProof) {
      return {
        error: new DelegationNotFound(
          `missing proof for delegation cid ${delegationLink}`
        ),
      }
    }

    delegations.push(delegationProof)
  }

  return { ok: delegations }
}

class DelegationNotFound extends Server.Failure {
  get name() {
    return /** @type {const} */ ('DelegationNotFound')
  }
}

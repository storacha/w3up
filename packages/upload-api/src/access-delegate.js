import * as Server from '@ucanto/server'
import * as Ucanto from '@ucanto/interface'
import * as Access from '@web3-storage/capabilities/access'
import * as Types from './types.js'
import * as Allocator from './space-allocate.js'

/**
 * @param {Types.SpaceServiceContext} ctx
 */
export const provide = (ctx) =>
  Server.provide(Access.delegate, (input) => delegate(input, ctx))

/**
 * @param {Types.Input<Access.delegate>} input
 * @param {Types.SpaceServiceContext} context
 * @returns {Promise<Ucanto.Result<Types.AccessDelegateSuccess, Types.AccessDelegateFailure>>}
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
 * @param {Types.InferInvokedCapability<typeof Access.delegate>} capability
 * @param {Types.Proof[]} proofs
 * @returns {Ucanto.Result<Types.Delegation<Types.Capabilities>[], Types.DelegationNotFound>}
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

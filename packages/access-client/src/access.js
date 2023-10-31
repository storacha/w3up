import * as Access from '@web3-storage/capabilities/access'
import * as Ucanto from '@ucanto/interface'
import { fail } from '@ucanto/core'
import { Agent } from './agent.js'

/**
 * Takes array of delegations and propagates them to their respective audiences
 * through a given space (or the current space if none is provided).
 *
 * Returns error result if agent has no current space and no space was provided.
 * Also returns error result if invocation fails.
 *
 * @param {Agent} agent - Agent connected to the w3up service.
 * @param {object} input
 * @param {Ucanto.Delegation[]} input.delegations - Delegations to propagate.
 * @param {Ucanto.DID} [input.space] - Space to propagate through.
 */
export const delegate = async (
  agent,
  { delegations, space = agent.currentSpace() }
) => {
  if (!space) {
    return fail('Space must be specified')
  }

  const entries = Object.values(delegations).map((proof) => [
    proof.cid.toString(),
    proof.cid,
  ])

  const { out } = await agent.invokeAndExecute(Access.delegate, {
    with: space,
    nb: {
      delegations: Object.fromEntries(entries),
    },
    // must be embedded here because it's referenced by cid in .nb.delegations
    proofs: delegations,
  })

  return out
}

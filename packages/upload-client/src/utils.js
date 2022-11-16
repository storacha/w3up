import { isDelegation } from '@ucanto/core'

/**
 * @param {import('@ucanto/interface').Proof[]} proofs
 * @param {import('@ucanto/interface').Ability} ability
 * @param {import('@ucanto/interface').DID} [audience]
 */
export function findCapability(proofs, ability, audience) {
  let capability
  for (const proof of proofs) {
    if (!isDelegation(proof)) continue
    if (audience != null && proof.audience.did() !== audience) continue
    capability = proof.capabilities.find((c) =>
      capabilityMatches(c.can, ability)
    )
    if (capability) break
  }
  if (!capability) {
    throw new Error(
      `Missing proof of delegated capability "${ability}"${
        audience ? ` for audience "${audience}"` : ''
      }`
    )
  }
  return capability
}

/**
 * @param {string} can
 * @param {import('@ucanto/interface').Ability} ability
 */
function capabilityMatches(can, ability) {
  if (can === ability) return true
  if (can === '*/*') return true
  if (can === '*') return true
  if (can.endsWith('*') && ability.startsWith(can.slice(0, -1))) return true
  return false
}

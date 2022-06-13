import * as ucans from 'ucans'

/**
 * @template T
 * @param {ucans.CapabilitySemantics<T>} semantics
 * @param {string} origin
 * @param {ucans.capability.Capability} cap
 * @param {ucans.Chained} ucan
 */
export function checkCap(semantics, origin, cap, ucan) {
  const capability = semantics.tryParsing(cap)
  if (!capability) {
    throw new Error('Invalid capability')
  }

  const nowInSeconds = Math.floor(Date.now() / 1000)
  const result = ucans.hasCapability(
    semantics,
    {
      info: {
        originator: origin, // self issued
        expiresAt: nowInSeconds,
      },
      capability,
    },
    ucan
  )

  if (!result) {
    throw new Error('Invalid capability')
  }

  return result
}

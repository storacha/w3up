// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import * as ucanto from '@ucanto/core'
import { canDelegateAbility } from '@web3-storage/capabilities/utils'

/**
 *
 * @param {Ucanto.Delegation} delegation
 */
export function isExpired(delegation) {
  if (
    delegation.expiration === undefined ||
    delegation.expiration <= Math.floor(Date.now() / 1000)
  ) {
    return true
  }
  return false
}

/**
 *
 * @param {Ucanto.Delegation} delegation
 */
export function isTooEarly(delegation) {
  if (!delegation.notBefore) {
    return false
  }
  return delegation.notBefore > Math.floor(Date.now() / 1000)
}

/**
 *
 * @param {Ucanto.Delegation} delegation
 * @param {object} [opts]
 * @param {Ucanto.Principal} [opts.checkAudience]
 * @param {boolean} [opts.checkIsExpired]
 * @param {boolean} [opts.checkIsTooEarly]
 */
export function validate(delegation, opts) {
  const {
    checkAudience,
    checkIsExpired = true,
    checkIsTooEarly = true,
  } = opts ?? {}

  if (checkAudience && delegation.audience.did() !== checkAudience.did()) {
    throw new Error(
      `Delegation audience ${delegation.audience.did()} does not match required DID ${checkAudience.did()}`
    )
  }

  if (checkIsExpired && isExpired(delegation)) {
    throw new Error(`Delegation expired.`)
  }

  if (checkIsTooEarly && isTooEarly(delegation)) {
    throw new Error(`Delegation is not active yet (too early).`)
  }
}

/**
 *
 * @param {import('@ucanto/interface').Delegation} delegation
 * @param {import('@ucanto/interface').Capability} child
 */
export function canDelegateCapability(delegation, child) {
  const allowsCapabilities = ucanto.Delegation.allows(delegation)
  if (allowsCapabilities[child.with]) {
    const cans = /** @type {import('@ucanto/interface').Ability[]} */ (
      Object.keys(allowsCapabilities[child.with])
    )
    for (const can of cans) {
      if (canDelegateAbility(can, child.can)) {
        return true
      }
    }
  }
  return false
}

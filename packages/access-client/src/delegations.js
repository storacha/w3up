import * as ucanto from '@ucanto/core'
import * as API from './types.js'
import { canDelegateAbility } from '@storacha/capabilities/utils'

/**
 *
 * @param {API.Delegation} delegation
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
 * @param {API.Delegation} delegation
 */
export function isTooEarly(delegation) {
  if (!delegation.notBefore) {
    return false
  }
  return delegation.notBefore > Math.floor(Date.now() / 1000)
}

/**
 *
 * @param {API.Delegation} delegation
 * @param {object} [opts]
 * @param {API.Principal} [opts.checkAudience]
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
 * Returns true if the delegation includes capability been queried.
 *
 * @param {API.Delegation} delegation
 * @param {API.CapabilityQuery} capability
 */
export function canDelegateCapability(delegation, capability) {
  const allowsCapabilities = ucanto.Delegation.allows(delegation)
  for (const [uri, abilities] of Object.entries(allowsCapabilities)) {
    if (matchResource(/** @type {API.Resource} */ (uri), capability.with)) {
      const cans = /** @type {API.Ability[]} */ (Object.keys(abilities))

      for (const can of cans) {
        if (canDelegateAbility(can, capability.can)) {
          return true
        }
      }
    }
  }
  return false
}

/**
 * Returns true if given `resource` matches the resource query per UCAN
 * specification.
 *
 * @param {API.Resource} resource
 * @param {API.ResourceQuery} query
 */
export const matchResource = (resource, query) => {
  if (query === 'ucan:*') {
    return true
  } else if (typeof query === 'string') {
    return resource === query
  } else {
    return query.test(resource)
  }
}

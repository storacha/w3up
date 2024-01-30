import * as ucanto from '@ucanto/core'
import * as API from '../types.js'
import { canDelegateAbility } from '@web3-storage/capabilities/utils'
import { ok } from 'assert'

/**
 *
 * @param {API.Delegation} delegation
 * @param {API.UTCUnixTimestamp} time
 */
export function isExpired(delegation, time) {
  if (delegation.expiration === undefined || delegation.expiration <= time) {
    return true
  }
  return false
}

/**
 * @param {API.Delegation} delegation
 * @param {API.UTCUnixTimestamp} time
 */
export function isTooEarly(delegation, time) {
  if (!delegation.notBefore) {
    return false
  }
  return delegation.notBefore > time
}

/**
 * @param {API.Delegation} delegation
 * @param {API.UTCUnixTimestamp} time
 */
export const isValid = (delegation, time) =>
  !isExpired(delegation, time) && !isTooEarly(delegation, time)

/**
 *
 * @param {API.Delegation} delegation
 * @param {object} [options]
 * @param {API.UTCUnixTimestamp} [options.time]
 * @param {API.Principal} [options.audience]
 */
export function validate(delegation, { audience, time } = {}) {
  if (audience && delegation.audience.did() !== audience.did()) {
    throw new Error(
      `Delegation audience ${delegation.audience.did()} does not match required DID ${audience.did()}`
    )
  }

  if (time && isExpired(delegation, time)) {
    throw new Error(`Delegation expired.`)
  }

  if (time && isTooEarly(delegation, time)) {
    throw new Error(`Delegation is not active yet (too early).`)
  }
}

/**
 * Returns true if the delegation includes capability been queried.
 *
 * @param {API.Delegation} delegation
 * @param {API.CapabilityQuery} query
 */
export function canDelegateCapability(delegation, query) {
  const allowsCapabilities = ucanto.Delegation.allows(delegation)
  for (const [uri, abilities] of Object.entries(allowsCapabilities)) {
    if (matchResource(/** @type {API.Resource} */ (uri), query.with)) {
      const { can } = query
      const cans = /** @type {API.Ability[]} */ (Object.keys(abilities))

      if (can == null) {
        return true
      } else if (cans.some((ability) => matchAbility(ability, can))) {
        return true
      }
    }
  }
  return false
}

/**
 * @param {API.Ability} ability
 * @param {API.AbilityQuery} query
 */
const matchAbility = (ability, query) => {
  if (typeof query === 'string') {
    return canDelegateAbility(ability, query)
  } else {
    return query.test(ability)
  }
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

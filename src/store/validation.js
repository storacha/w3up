import * as API from '@ucanto/interface'
import { Failure } from '@ucanto/validator'

/**
 * Checks that `with` on claimed capability is the same as `with`
 * in delegated capability. Note this will ignore `can` field.
 *
 * @template {API.ParsedCapability<API.Ability>} T
 * @template {API.ParsedCapability<API.Ability>} U
 * @param {T} claimed
 * @param {U} delegated
 */
export const equalWith = (claimed, delegated) =>
  claimed.uri.href === delegated.uri.href ||
  new Failure(
    `Can not derive ${claimed.can} with ${claimed.uri.href} from ${delegated.uri.href}`
  )

/**
 * @param {string} claimed
 * @param {string} delegated
 */
export const derivesURIPattern = (claimed, delegated) => {
  if (delegated.endsWith('*')) {
    if (claimed.startsWith(delegated.slice(0, -1))) {
      return true
    } else {
      return new Failure(`${claimed} does not match ${delegated}`)
    }
  }

  if (claimed === delegated) {
    return true
  } else {
    return new Failure(`${claimed} is differnt from ${delegated}`)
  }
}

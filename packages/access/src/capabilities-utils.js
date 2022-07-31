import { Failure } from '@ucanto/validator'
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'

/**
 * Check URI can be delegated
 *
 * @param {string} child
 * @param {string} parent
 */
export function canDelegateURI(child, parent) {
  if (parent.endsWith('*')) {
    return child.startsWith(parent.slice(0, -1))
      ? true
      : new Failure(`${child} does not match ${parent}`)
  }

  return child === parent
    ? true
    : new Failure(`${child} is different from ${parent}`)
}

/**
 * Checks that `with` on claimed capability is the same as `with`
 * in delegated capability. Note this will ignore `can` field.
 *
 * @param {Types.ParsedCapability} child
 * @param {Types.ParsedCapability} parent
 */
export function equalWith(child, parent) {
  return (
    child.with === parent.with ||
    new Failure(
      `Can not derive ${child.can} with ${child.with} from ${parent.with}`
    )
  )
}

/**
 * @template {Types.ParsedCapability<"store/add"|"store/remove", Types.URI<'did:'>, {link?: Types.Link<unknown, number, number, 0|1>}>} T
 * @param {T} claimed
 * @param {T} delegated
 */
export const derives = (claimed, delegated) => {
  if (claimed.uri.href !== delegated.uri.href) {
    return new Failure(
      `Expected 'with: "${delegated.uri.href}"' instead got '${claimed.uri.href}'`
    )
  } else if (
    delegated.caveats.link &&
    `${delegated.caveats.link}` !== `${claimed.caveats.link}`
  ) {
    return new Failure(
      `Link ${
        // eslint-disable-next-line unicorn/no-null
        claimed.caveats.link == null ? '' : `${claimed.caveats.link} `
      }violates imposed ${delegated.caveats.link} constraint`
    )
  } else {
    return true
  }
}

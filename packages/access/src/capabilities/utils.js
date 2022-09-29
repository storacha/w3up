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
  if (claimed.with !== delegated.with) {
    return new Failure(
      `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
    )
  } else if (
    delegated.nb.link &&
    `${delegated.nb.link}` !== `${claimed.nb.link}`
  ) {
    return new Failure(
      `Link ${
        // eslint-disable-next-line unicorn/no-null
        claimed.nb.link == null ? '' : `${claimed.nb.link} `
      }violates imposed ${delegated.nb.link} constraint`
    )
  } else {
    return true
  }
}

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
 * @param {unknown} child
 * @param {unknown} parent
 * @param {string} constraint
 */

export function equal(child, parent, constraint) {
  if (parent === undefined || parent === '*') {
    return true
  } else if (String(child) !== String(parent)) {
    return new Failure(
      `Contastraint vilation: ${child} violates imposed ${constraint} constraint ${parent}`
    )
  } else {
    return true
  }
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

/**
 * @param {Types.Failure | true} value
 */
export function fail(value) {
  return value === true ? undefined : value
}

export const List = {
  /**
   * @template T
   * @param {Types.Decoder<unknown, T>} decoder
   * @returns {Types.Decoder<unknown, T[]> & { optional(): Types.Decoder<unknown, undefined|Array<T>>}}
   */
  of: (decoder) => ({
    decode: (input) => {
      if (!Array.isArray(input)) {
        return new Failure(`Expected to be an array instead got ${input} `)
      }
      /** @type {T[]} */
      const results = []
      for (const item of input) {
        const result = decoder.decode(item)
        if (result?.error) {
          return new Failure(
            `Array containts invalid element: ${result.message}`
          )
        } else {
          results.push(result)
        }
      }
      return results
    },
    optional: () => optional(List.of(decoder)),
  }),
}

/**
 * @template T
 * @param {Types.Decoder<unknown, T>} decoder
 * @returns {Types.Decoder<unknown, undefined|T, Types.Failure>}
 */
export const optional = (decoder) => ({
  decode: (input) => (input === undefined ? input : decoder.decode(input)),
})

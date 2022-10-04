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
 * @returns {Types.Result<true, Types.Failure>}
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

/**
 * @template T
 * @param {Types.Decoder<unknown, T>} decoder
 * @returns {Types.Decoder<unknown, undefined|T, Types.Failure>}
 */
export const optional = (decoder) => ({
  decode: (input) => (input === undefined ? input : decoder.decode(input)),
})

/**
 * @template T
 * @implements {Types.Decoder<unknown, T, Types.Failure>}
 */
class Never {
  /**
   * @param {unknown} input
   * @returns {Types.Result<T, Types.Failure>}
   */
  decode(input) {
    return new Failure(`Given input is not valid`)
  }

  /**
   * @returns {Types.Decoder<unknown, undefined|T, Types.Failure>}
   */
  optional() {
    return new Optional(this)
  }
}

/**
 * @template T
 * @implements {Types.Decoder<unknown, T|undefined, Types.Failure>}
 */
class Optional {
  /**
   * @param {Types.Decoder<unknown, T, Types.Failure>} decoder
   */
  constructor(decoder) {
    this.decoder = decoder
  }

  optional() {
    return this
  }

  /**
   * @param {unknown} input
   */
  decode(input) {
    return input === undefined ? undefined : this.decoder.decode(input)
  }
}

/**
 * @template T
 * @extends {Never<T[]>}
 * @implements {Types.Decoder<unknown, T[], Types.Failure>}
 */
export class List extends Never {
  /**
   * @template T
   * @param {Types.Decoder<unknown, T, Types.Failure>} decoder
   */
  static of(decoder) {
    return new this(decoder)
  }

  /**
   * @param {Types.Decoder<unknown, T, Types.Failure>} decoder
   * @private
   */
  constructor(decoder) {
    super()
    this.decoder = decoder
  }

  /**
   * @param {unknown} input
   */
  decode(input) {
    if (!Array.isArray(input)) {
      return new Failure(`Expected to be an array instead got ${input} `)
    }
    /** @type {T[]} */
    const results = []
    for (const item of input) {
      const result = this.decoder.decode(item)
      if (result?.error) {
        return new Failure(`Array containts invalid element: ${result.message}`)
      } else {
        results.push(result)
      }
    }
    return results
  }
}

/**
 * @typedef {Types.Phantom<{kind:"Int"}> & number} integer
 * @extends {Never<integer>}
 * @implements {Types.Decoder<unknown, integer, Types.Failure>}
 */
export class IntegerDecoder extends Never {
  /**
   * @param {{min?: number, max?: number}} options
   */
  // eslint-disable-next-line unicorn/prefer-number-properties
  constructor({ min = -Infinity, max = Infinity } = {}) {
    super()
    this.min = min
    this.max = max
  }

  /**
   * @param {unknown} value
   * @returns {value is integer}
   */
  static isInteger(value) {
    return Number.isInteger(value)
  }

  /**
   * @param {unknown} input
   * @returns {Types.Result<integer, Types.Failure>}
   */
  decode(input) {
    const { min, max } = this
    if (!IntegerDecoder.isInteger(input)) {
      return new Failure(
        `Expecting an Integer but instead got: ${typeof input} ${input}`
      )
    } else if (min > input) {
      return new Failure(
        `Expecting an Integer > ${min} but instead got ${input}`
      )
    } else if (max < input) {
      return new Failure(
        `Expecting an Integer < ${max} but instead got ${input}`
      )
    } else {
      return input
    }
  }

  /**
   * @param {number} min
   */
  greater(min) {
    return new IntegerDecoder({ min, max: this.max })
  }

  /**
   * @param {number} max
   */
  less(max) {
    return new IntegerDecoder({ min: this.min, max })
  }
}

export const Integer = new IntegerDecoder()

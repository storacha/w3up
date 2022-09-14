import { asLink, create, createV0, isLink, parse } from '@ucanto/core/link'
import * as API from '@ucanto/interface'
import { Failure } from '@ucanto/validator'

export { create, createV0, isLink, asLink, parse }

/**
 * @typedef {number} Code
 * @typedef {number} Alg
 * @typedef {1|0} Version
 * @typedef {{code?:Code, algorithm?:Alg, version?:Version}} LinkOptions
 * @typedef {API.Link<unknown, Code, Alg, Version>} Link
 */

/**
 * Validates that a given cid is actually a CID.
 *
 * @param {unknown} input
 * @param {LinkOptions} [options]
 * @returns {Link|Failure}
 */
const validateCID = (input, options = {}) => {
  if (input == null) {
    return new Failure(`Expected link to be a CID instead of ${input}`)
  } else {
    const cid = asLink(input)
    if (cid == null) {
      return new Failure(`Expected link to be a CID instead of ${input}`)
    }
    if (options.code != null && cid.code !== options.code) {
      return new Failure(
        `Expected link to be CID with 0x${options.code.toString(16)} codec`
      )
    }
    if (options.algorithm != null && cid.multihash.code !== options.algorithm) {
      return new Failure(
        `Expected link to be CID with 0x${options.algorithm.toString(
          16
        )} hashing algorithm`
      )
    }

    if (options.version != null && cid.version !== options.version) {
      return new Failure(
        `Expected link to be CID version ${options.version} instead of ${cid.version}`
      )
    }
    return cid
  }
}

/**
 * @param {unknown} input
 * @param {LinkOptions} [options]
 * @returns {Array<Link>|API.Failure}
 */
export const decode = (input, options = {}) => {
  if (input == null) {
    return new Failure(`Expected links but got ${input} instead`)
  } else {
    if (!Array.isArray(input)) {
      return new Failure(`Expected ${input} to be iterable, but is not`)
    }

    const cids = input.map((cid) => validateCID(cid, options))
    for (const cid of cids) {
      if (cid instanceof Failure) {
        return cid
      }
    }

    // @ts-ignore
    return cids
  }
}

/**
 * @param {LinkOptions} options
 * @returns {API.Decoder<unknown, Array<Link|null>, API.Failure>}
 */
export const match = (options) => ({
  /** @param {unknown} input */
  decode: (input) => decode(input, options),
})

/**
 * @param {LinkOptions} [options]
 * @returns {API.Decoder<unknown, Array<Link>|undefined, API.Failure>}
 */
export const optional = (options) => ({
  decode: (input) => {
    if (input === undefined) {
      return undefined
    } else {
      return decode(input, options)
    }
  },
})

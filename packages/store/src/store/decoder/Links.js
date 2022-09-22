import { asLink, create, createV0, isLink, parse } from '@ucanto/core/link'
import * as API from '@ucanto/interface'
import { Failure } from '@ucanto/validator/src/error.js'

const validateCID = (cid, options) => {
  if (cid == null) {
    return new Failure(`Expected link to be a CID instead of ${cid}`)
  } else {
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
  }
}

/**
 * @template {number} Code
 * @template {number} Alg
 * @template {1|0} Version
 * @param {unknown} input
 * @param {{code?:Code, algorithm?:Alg, version?:Version}} [options]
 * @returns {API.Result<API.Link<unknown, Code, Alg, Version>, API.Failure>}
 */
export const decode = (input, options = {}) => {
  if (input == null) {
    return new Failure(`Expected links but got ${input} instead`)
  } else {
    if (!input.map) {
      return new Failure(`Expected ${input} to be iterable, but is not`)
    }

    const cids = input.map((input) => asLink(input))

    cids.forEach((cid) => validateCID(cid, options))

    return cids
  }
}

/**
 * @template {number} Code
 * @template {number} Alg
 * @template {1|0} Version
 * @param {{code?:Code, algorithm?:Alg, version?:Version}} options
 * @returns {API.Decoder<unknown,  API.Link<unknown, Code, Alg, Version>, API.Failure>}
 */

export const match = (options) => ({
  decode: (input) => decode(input, options),
})

/**
 * @template {number} Code
 * @template {number} Alg
 * @template {1|0} Version
 * @param {{code?:Code, algorithm?:Alg, version?:Version}} [options]
 * @returns {API.Decoder<unknown, undefined|API.Link<unknown, Code, Alg, Version>, API.Failure>}
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

export { create, createV0, isLink, asLink, parse }

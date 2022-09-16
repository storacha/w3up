// eslint-disable-next-line no-unused-vars
import * as API from '@ucanto/interface'
import { asLink,     } from '@ucanto/core/link'
import { Failure } from '@ucanto/validator'



/**
 * @template {number} Code
 * @template {number} Alg
 * @template {1|0} Version
 * @param {API.Link<unknown, Code, Alg, Version>|null} cid
 * @param {{code?:Code, algorithm?:Alg, version?:Version}} [options]
 * @returns {API.Link<unknown, Code, Alg, Version>|API.Failure}
 */
const validateCID = (cid, options = {}) => {
  if (!cid) {
    return new Failure(`Expected link to be a CID instead of ${cid}`)
  } else {
    if (options.code && cid.code !== options.code) {
      return new Failure(
        `Expected link to be CID with 0x${options.code.toString(16)} codec`
      )
    }
    if (options.algorithm && cid.multihash.code !== options.algorithm) {
      return new Failure(
        `Expected link to be CID with 0x${options.algorithm.toString(
          16
        )} hashing algorithm`
      )
    }

    if (options.version && cid.version !== options.version) {
      return new Failure(
        `Expected link to be CID version ${options.version} instead of ${cid.version}`
      )
    }
  }

  return cid
}

/**
 * @template {number} Code
 * @template {number} Alg
 * @template {1|0} Version
 * @param {unknown} input
 * @param {{code?:Code, algorithm?:Alg, version?:Version}} [options]
 * @returns {API.Result<Array<API.Link<unknown, Code, Alg, Version>>, API.Failure>}
 */
export const decode = (input, options = {}) => {
  if (!input) {
    return new Failure(`Expected links but got ${input} instead`)
  } else {
    if (!Array.isArray(input) || !input.map) {
      return new Failure(`Expected ${input} to be iterable, but is not`)
    }

    const cids = input.map((x) => asLink(x)).map((x) => validateCID(x, options))

    const failed = cids.find((x) => x instanceof Failure)

    if (failed && failed instanceof Failure) {
      return failed
    }

    // @ts-ignore
    return cids
  }
}

/**
 * @template {number} Code
 * @template {number} Alg
 * @template {1|0} Version
 * @param {{code?:Code, algorithm?:Alg, version?:Version}} options
 * @returns {API.Decoder<unknown,  Array<API.Link<unknown, Code, Alg, Version>>, API.Failure>}
 */
export const match = (options) => ({
  decode: (input) => decode(input, options),
})

/**
 * @template {number} Code
 * @template {number} Alg
 * @template {1|0} Version
 * @param {{code?:Code, algorithm?:Alg, version?:Version}} [options]
 * @returns {API.Decoder<unknown, undefined|Array<API.Link<unknown, Code, Alg, Version>>, API.Failure>}
 */
export const optional = (options) => ({
  decode: (input) => {
    return input === undefined ? undefined : decode(input, options)
  },
})
export {create, createV0, isLink, parse} from '@ucanto/core/link'

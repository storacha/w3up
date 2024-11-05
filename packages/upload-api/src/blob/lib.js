import { Failure } from '@ucanto/server'
import { base58btc } from 'multiformats/bases/base58'
import * as API from '../types.js'

export const AwaitErrorName = 'AwaitError'

/**
 * @implements {API.AwaitError}
 */
export class AwaitError extends Failure {
  /**
   * @param {object} source
   * @param {string} source.at - argument path that referenced failed `await`
   * @param {import('@ucanto/interface').UnknownLink} source.reference - awaited reference that failed
   * @param {import('@ucanto/interface').Failure} source.cause - error that caused referenced `await` to fail
   */
  constructor({ at, reference, cause }) {
    super()
    this.at = at
    this.reference = reference
    this.cause = cause
  }
  describe() {
    return `Awaited ${this.reference} reference at ${this.at} has failed:\n${this.cause}`
  }

  /**
   * @type {'AwaitError'}
   */
  get name() {
    return AwaitErrorName
  }
  toJSON() {
    return {
      ...super.toJSON(),
    }
  }
}

export class BlobNotFound extends Failure {
  static name = /** @type {const} */ ('BlobNotFound')
  #digest

  /** @param {import('multiformats').MultihashDigest} digest */
  constructor(digest) {
    super()
    this.#digest = digest
  }
  describe() {
    return `blob not found: ${base58btc.encode(this.#digest.bytes)}`
  }
  get name() {
    return BlobNotFound.name
  }
  get digest() {
    return this.#digest.bytes
  }
}

export class EntryNotFound extends Failure {
  static name = /** @type {const} */ ('EntryNotFound')

  get reason() {
    return this.message
  }

  get name() {
    return EntryNotFound.name
  }
}

export class EntryExists extends Failure {
  static name = /** @type {const} */ ('EntryExists')

  get reason() {
    return this.message
  }

  get name() {
    return EntryExists.name
  }
}

export class AllocatedMemoryNotWrittenError extends Failure {
  static name = /** @type {const} */ ('AllocatedMemoryHadNotBeenWrittenTo')

  get name() {
    return AllocatedMemoryNotWrittenError.name
  }

  describe() {
    return 'Blob not found'
  }
}

export class BlobSizeLimitExceededError extends Failure {
  static name = /** @type {const} */ ('BlobSizeOutsideOfSupportedRange')

  get name() {
    return BlobSizeLimitExceededError.name
  }

  /**
   * @param {number} size
   * @param {number} max
   */
  constructor(size, max) {
    super()
    this.size = size
    this.max = max
  }

  describe() {
    return `Blob of ${this.size} bytes, exceeds size limit of ${this.max} bytes`
  }
}

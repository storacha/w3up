import { Failure } from '@ucanto/server'
import { base58btc } from 'multiformats/bases/base58'
import * as API from '../types.js'

export const AllocatedMemoryHadNotBeenWrittenToName =
  'AllocatedMemoryHadNotBeenWrittenTo'
export class AllocatedMemoryHadNotBeenWrittenTo extends Failure {
  get name() {
    return AllocatedMemoryHadNotBeenWrittenToName
  }

  describe() {
    return `Blob not found`
  }
}

export const BlobSizeOutsideOfSupportedRangeName =
  'BlobSizeOutsideOfSupportedRange'
export class BlobSizeOutsideOfSupportedRange extends Failure {
  /**
   * @param {number} blobSize
   * @param {number} maxUploadSize
   */
  constructor(blobSize, maxUploadSize) {
    super()
    this.blobSize = blobSize
    this.maxUploadSize = maxUploadSize
  }

  get name() {
    return BlobSizeOutsideOfSupportedRangeName
  }

  describe() {
    return `Blob size ${this.blobSize} exceeded maximum size limit: ${this.maxUploadSize}, consider splitting it into blobs that fit limit.`
  }

  toJSON() {
    return {
      ...super.toJSON(),
      maxUploadSize: this.maxUploadSize,
      blobSize: this.blobSize,
    }
  }
}

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

export class UnsupportedCapability extends Failure {
  /**
   * @param {object} source
   * @param {API.Capability} source.capability
   */
  constructor({ capability: { with: subject, can } }) {
    super()

    this.capability = { with: subject, can }
  }
  get name() {
    return /** @type {const} */ ('UnsupportedCapability')
  }
  describe() {
    return `${this.capability.with} does not have a "${this.capability.can}" capability provider`
  }
}

import { Failure } from '@ucanto/server'

export const AllocatedMemoryHadNotBeenWrittenToName =
  'AllocatedMemoryHadNotBeenWrittenTo'
export class AllocatedMemoryHadNotBeenWrittenTo extends Failure {
  /**
   * @param {import('@ucanto/interface').DID} [space]
   */
  constructor(space) {
    super()
    this.space = space
  }

  get name() {
    return AllocatedMemoryHadNotBeenWrittenToName
  }

  describe() {
    if (this.space) {
      return `Blob not found in ${this.space}`
    }
    return `Blob not found`
  }

  toJSON() {
    return {
      ...super.toJSON(),
      space: this.space,
    }
  }
}

export const BlobSizeOutsideOfSupportedRangeName =
  'BlobSizeOutsideOfSupportedRange'
export class BlobSizeOutsideOfSupportedRange extends Failure {
  /**
   * @param {Number} maxUploadSize
   */
  constructor(maxUploadSize) {
    super()
    this.maxUploadSize = maxUploadSize
  }

  get name() {
    return BlobSizeOutsideOfSupportedRangeName
  }

  describe() {
    return `Blob exceeded maximum size limit: ${this.maxUploadSize}, consider splitting it into blobs that fit limit.`
  }

  toJSON() {
    return {
      ...super.toJSON(),
      maxUploadSize: this.maxUploadSize,
    }
  }
}

export const AwaitErrorName = 'AwaitError'
export class AwaitError extends Failure {
  /**
   * @param {object} source
   * @param {string} source.at - argument path that referenced failed `await`
   * @param {[selector: string, task: import('@ucanto/interface').UnknownLink]} source.reference - awaited reference that failed
   * @param {import('@ucanto/interface').Failure} source.cause - error that caused referenced `await` to fail
   */
  constructor({ at, reference, cause }) {
    super()
    this.at = at
    this.reference = reference
    this.cause = cause
  }
  describe() {
    const [selector, task] = this.reference
    return `Awaited (${selector} ${task}) reference at ${this.at} has failed:\n${this.cause}`
  }
  get name() {
    return AwaitErrorName
  }
  toJSON() {
    return {
      ...super.toJSON(),
    }
  }
}

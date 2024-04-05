import { Failure } from '@ucanto/server'

export const BlobItemNotFoundName = 'BlobItemNotFound'
export class BlobItemNotFound extends Failure {
  /**
   * @param {import('@ucanto/interface').DID} [space]
   */
  constructor(space) {
    super()
    this.space = space
  }

  get name() {
    return BlobItemNotFoundName
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

export const BlobExceedsSizeLimitName = 'BlobExceedsSizeLimit'
export class BlobExceedsSizeLimit extends Failure {
  /**
   * @param {Number} maxUploadSize
   */
  constructor(maxUploadSize) {
    super()
    this.maxUploadSize = maxUploadSize
  }

  get name() {
    return BlobExceedsSizeLimitName
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

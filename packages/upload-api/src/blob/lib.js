import { Failure } from '@ucanto/server'

export class BlobItemNotFound extends Failure {
  /**
   * @param {import('@ucanto/interface').DID} space
   */
  constructor(space) {
    super()
    this.space = space
  }

  get name() {
    return 'BlobItemNotFound'
  }

  describe() {
    return `Blob not found in ${this.space}`
  }

  toJSON() {
    return {
      ...super.toJSON(),
      space: this.space,
    }
  }
}

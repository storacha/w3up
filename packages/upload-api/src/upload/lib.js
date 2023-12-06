import { Failure } from '@ucanto/server'

export class UploadNotFound extends Failure {
  /**
   * @param {import('@ucanto/interface').DID} space
   * @param {import('@ucanto/interface').UnknownLink} root
   */
  constructor(space, root) {
    super()
    this.space = space
    this.root = root
  }

  get name() {
    return 'UploadNotFound'
  }

  describe() {
    return `${this.root} not found in ${this.space}`
  }

  toJSON() {
    return {
      ...super.toJSON(),
      space: this.space,
      root: { '/': this.root.toString() },
    }
  }
}

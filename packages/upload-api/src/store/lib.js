import { Failure } from '@ucanto/server'

export class StoreItemNotFound extends Failure {
  /**
   * @param {import('@ucanto/interface').DID} space
   * @param {import('@ucanto/interface').UnknownLink} link
   */
  constructor(space, link) {
    super()
    this.space = space
    this.link = link
  }

  get name() {
    return 'StoreItemNotFound'
  }

  describe() {
    return `${this.link} not found in ${this.space}`
  }

  toJSON() {
    return {
      ...super.toJSON(),
      space: this.space,
      link: { '/': this.link.toString() },
    }
  }
}

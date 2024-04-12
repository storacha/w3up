import { Failure } from '@ucanto/server'

export const ReferencedInvocationNotFoundName = 'ReferencedInvocationNotFound'
export class ReferencedInvocationNotFound extends Failure {
  /**
   * @param {import('@ucanto/interface').Link} [invocation]
   */
  constructor(invocation) {
    super()
    this.invocation = invocation
  }

  get name() {
    return ReferencedInvocationNotFoundName
  }

  describe() {
    if (this.invocation) {
      return `Invocation not found in ${this.invocation.toString()}`
    }
    return `Invocation not found`
  }

  toJSON() {
    return {
      ...super.toJSON(),
      invocation: this.invocation,
    }
  }
}

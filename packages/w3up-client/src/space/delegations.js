import * as API from '../types.js'
import * as Access from '../access.js'

/**
 * @param {API.SpaceSession} session
 */
export const view = (session) => new Delegations(session)

/**
 */
class Delegations {
  /**
   * @param {API.SpaceSession} session
   */
  constructor(session) {
    this.session = session
  }

  /**
   *
   * @param {API.Authorization} authorization
   */
  add(authorization) {
    return Access.delegate(this.session, {
      delegations: authorization.proofs,
      subject: this.session.did(),
    })
  }

  // TODO: We really should allow deleting and listing delegations also.
}

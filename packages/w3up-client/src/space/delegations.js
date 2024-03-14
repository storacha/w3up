import * as API from '../types.js'
import * as Access from '../access.js'
import * as Session from '../session.js'

/**
 * @param {API.Session<API.AccessProtocol>} session
 * @returns {API.SpaceDelegationsView}
 */
export const view = (session) => new Delegations(session)

/**
 * @implements {API.SpaceDelegationsView}
 */
class Delegations {
  /**
   * @param {API.Session<API.AccessProtocol>} session
   */
  constructor(session) {
    this.session = session
  }

  /**
   *
   * @param {API.Authorization} authorization
   */
  add(authorization) {
    const task = Access.delegate(this.session, {
      delegations: authorization.proofs,
      subject: /** @type {API.DIDKey} */ (this.session.agent.signer.did()),
    })

    return Session.perform(task)
  }

  // TODO: We really should allow deleting and listing delegations also.
}

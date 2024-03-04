import * as API from '../types.js'
import * as Usage from './usage.js'
import * as DB from '../agent/db.js'
import * as Session from './session.js'
import * as Delegations from './delegations.js'

/**
 * @param {object} model
 * @param {API.DIDKey} model.subject
 * @param {API.Signer} model.signer
 * @param {string} model.name
 * @param {API.Delegation[]} model.proofs
 */
export const create = ({ signer, name, subject, proofs }) => {
  const agent = { signer, db: DB.from({ proofs }) }

  return new SharedSpace({
    agent,
    name,
    subject,
  })
}

/**
 * @implements {API.SharedSpaceView}
 */
class SharedSpace {
  /**
   * @param {object} model
   * @param {API.Agent} model.agent
   * @param {API.DIDKey} model.subject
   * @param {string} model.name
   */
  constructor(model) {
    this.model = model
  }
  get authority() {
    return this.model.agent.signer.did()
  }
  get subject() {
    return this.model.subject
  }
  did() {
    return this.model.subject
  }
  get name() {
    return this.model.name
  }

  get proofs() {
    return [...this.model.agent.db.proofs.values()].map(
      ({ delegation }) => delegation
    )
  }

  /**
   * @template {API.UsageProtocol & API.SpaceProtocol} Protocol
   * @param {API.Connection<Protocol>} connection
   * @returns {API.SharedSpaceSession<Protocol>}
   */
  connect(connection) {
    return new SharedSpaceSession({
      ...this.model,
      connection,
    })
  }
}

/**
 * @template {API.PlanProtocol} [Protocol=API.W3UpProtocol]
 * @typedef {object} Model
 * @property {API.DIDKey} id
 * @property {API.Session<Protocol>} session
 */

/**
 * @template {API.UsageProtocol & API.SpaceProtocol} [Protocol=API.W3UpProtocol]
 * @implements {API.SharedSpaceSession<Protocol>}
 */
class SharedSpaceSession {
  /**
   * @param {object} model
   * @param {API.DIDKey} model.subject
   * @param {string} model.name
   * @param {API.Connection<Protocol>} model.connection
   * @param {API.Agent} model.agent
   */
  constructor(model) {
    this.model = model
    this.usage = Usage.view(this)

    this.delegations = Delegations.view(
      /** @type {API.SpaceSession<any>} */ (this)
    )
  }
  get connection() {
    return this.model.connection
  }
  get agent() {
    return this.model.agent
  }
  get authority() {
    return this.agent.signer.did()
  }
  did() {
    return this.model.subject
  }
  get name() {
    return this.model.name
  }

  info() {
    return Session.info(this)
  }

  get proofs() {
    return [...this.model.agent.db.proofs.values()].map(
      ({ delegation }) => delegation
    )
  }
}

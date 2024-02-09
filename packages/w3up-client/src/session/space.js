import * as API from '../types.js'
import * as DB from '../agent/db.js'
import * as SpaceQuery from '../agent/space.js'

/**
 * @param {API.Session<API.W3UpProtocol>} session
 */
export const from = (session) => new View(session)

class View {
  /**
   * @param {API.Session<API.W3UpProtocol>} session
   */
  constructor(session) {
    this.session = session
  }

  list() {
    return list(this.session)
  }
}

/**
 * @param {API.Session<API.PlanProtocol>} session
 */
export const list = async (session) => {
  const results = DB.query(
    session.agent.db.index,
    SpaceQuery.query({ authority: session.agent.did() })
  )

  return build(session, results)
}

/**
 * @template {API.PlanProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} session
 * @param {{space:API.DIDKey, name?: string}[]} spaces
 */
const build = (session, spaces) => {
  /** @type {Record<API.DIDKey, SharedSpace<Protocol>>} */
  const result = {}
  for (const { space: id, name = '' } of spaces) {
    if (!result[id]) {
      result[id] = new SharedSpace({ session, id, name })
    }
  }

  return result
}

/**
 * @template {API.PlanProtocol} [Protocol=API.W3UpProtocol]
 * @typedef {object} Model
 * @property {API.DIDKey} id
 * @property {API.Session<Protocol>} session
 */

/**
 * @template {API.UnknownProtocol} [Protocol=API.W3UpProtocol]
 */
class SharedSpace {
  /**
   * @param {object} model
   * @param {API.DIDKey} model.id
   * @param {string} model.name
   * @param {API.Session<Protocol>} model.session
   */
  constructor(model) {
    this.model = model
  }
  get did() {
    return this.model.id
  }
}

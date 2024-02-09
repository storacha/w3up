import * as API from './types.js'

/**
 * @template {API.UnknownProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} model
 */
export const create = (model) => new Session(model)

/**
 * @template {API.UnknownProtocol} [Protocol=API.W3UpProtocol]
 * @implements {API.Session<Protocol>}
 */
class Session {
  /**
   * @param {API.Session<Protocol>} model
   */
  constructor(model) {
    this.model = model
  }
  get connection() {
    return this.model.connection
  }
  get agent() {
    return this.model.agent
  }
}

/**
 * @template {API.UnknownProtocol} [Protocol=API.W3UpProtocol]
 */
class SessionSpaces {
  /**
   * @param {API.Session<Protocol>} session
   */
  constructor(session) {
    this.session = session
  }
  list() {}
}

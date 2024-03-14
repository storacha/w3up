import * as API from './types.js'
import * as DB from './agent/db.js'
import * as Query from './space/query.js'
import * as Space from './space/space.js'
import * as Task from './task.js'

export * from './space/space.js'

/**
 * @param {API.Session<API.W3UpProtocol>} session
 * @returns {API.SpaceManager}
 */
export const view = (session) => new SessionSpaces(session)

/**
 * @param {API.Session<API.W3UpProtocol>} session
 */
export const list = (session) => {
  const results = DB.query(
    session.agent.db.index,
    Query.query({ audience: session.agent.signer.did() })
  )

  return build(session, results)
}

/**
 * @template {API.UnknownProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} session
 * @param {API.SpaceView} space
 * @returns {Task.Task<API.Unit, API.SpaceStoreError>}
 */
export function* add(session, space) {
  if (space.authority === session.agent.signer.did()) {
    return yield* DB.transact(
      session.agent.db,
      space.proofs.map((proof) => DB.assert({ proof }))
    )
  } else {
    return yield* Task.fail(
      new PrincipalAlignmentError({
        message: `Space is shared with ${
          space.authority
        } not ${session.agent.signer.did()}`,
        expect: space.authority,
        actual: session.agent.signer.did(),
      })
    )
  }
}

/**
 * Removes shared space authorization from the agent's database. If there are
 * more authorizations for the space, space will continue to show up in the
 * list of spaces, but only capabilities delegated through those authorizations
 * will be available.
 *
 * @template {API.UnknownProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} session
 * @param {API.SpaceView} space
 * @returns {Task.Task<API.Unit, API.SpaceStoreError>}
 */
export function* remove(session, space) {
  yield* DB.transact(
    session.agent.db,
    space.proofs.map((proof) => DB.retract({ proof }))
  )

  return {}
}

/**
 * @template {Space.SpaceProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} session
 * @param {object} source
 * @param {string} source.mnemonic
 * @param {string} source.name
 * @returns {Task.Task<API.OwnSpaceView, Task.AbortError>}
 */
export const fromMnemonic = (session, { mnemonic, name }) =>
  Space.fromMnemonic(mnemonic, { name, session })

/**
 * @template {Space.SpaceProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} session
 * @param {{space:API.DIDKey, name?: string, proof: DB.Link}[]} spaces
 */
const build = (session, spaces) => {
  const { proofs } = session.agent.db
  /** @type {Record<API.DIDKey, Space.Model<Protocol>>} */
  const result = {}
  for (const { space: subject, name = '', proof } of spaces) {
    const { delegation } = /** @type {{delegation: API.Delegation}} */ (
      proofs.get(proof.toString())
    )

    if (!result[subject]) {
      result[subject] = {
        subject,
        signer: /** @type {API.Signer<API.DIDKey>} */ (session.agent.signer),
        name,
        proofs: [delegation],
        session,
      }
    } else {
      result[subject].proofs.push(delegation)
    }
  }

  return Object.fromEntries(
    Object.entries(result).map(([k, model]) => [k, Space.view(model)])
  )
}

/**
 * @implements {API.SpaceManager}
 */
class SessionSpaces {
  /**
   * @param {API.Session<API.W3UpProtocol>} session
   */
  constructor(session) {
    this.session = session
  }
  list() {
    return list(this.session)
  }
  /**
   * @param {API.SpaceView} space
   */
  add(space) {
    return Task.perform(add(this.session, space))
  }
  /**
   * @param {API.SpaceView} space
   */
  remove(space) {
    return Task.perform(remove(this.session, space))
  }

  *[Symbol.iterator]() {
    yield* Object.values(this.list())
  }

  /**
   * @param {object} source
   * @param {string} source.name
   * @returns {Task.Invocation<API.OwnSpaceView>}
   */
  create(source) {
    return Task.perform(Space.create({ ...source, session: this.session }))
  }
}

class PrincipalAlignmentError extends Error {
  /**
   *
   * @param {object} options
   * @param {string} options.message
   * @param {API.DID} options.expect
   * @param {API.DID} options.actual
   */
  constructor({ message, expect, actual }) {
    super(message)
    this.expect = expect
    this.actual = actual
  }
  name = /** @type {const} */ ('PrincipalAlignmentError')
}

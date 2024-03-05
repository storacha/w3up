import * as API from './types.js'
import * as DB from './agent/db.js'
import * as Query from './space/query.js'
import * as SharedSpace from './space/shared.js'
import * as OwnSpace from './space/own.js'

/**
 * @param {API.Session<API.W3UpProtocol>} session
 * @returns {API.SpacesSession}
 */
export const view = (session) => new SessionSpaces(session)

export const { create, fromMnemonic } = OwnSpace

/**
 * @param {API.Session<API.W3UpProtocol>} session
 */
export const list = (session) => {
  const results = DB.query(
    session.agent.db.index,
    Query.query({ authority: session.agent.signer.did() })
  )

  return build(session, results)
}

/**
 * @template {API.UnknownProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} session
 * @param {API.SharedSpace} space
 */
export const add = async (session, space) => {
  if (space.authority === session.agent.signer.did()) {
    return await DB.transact(
      session.agent.db,
      space.proofs.map((proof) => DB.assert({ proof }))
    )
  } else {
    return {
      error: new PrincipalAlignmentError(
        `Space is shared with ${
          space.authority
        } not ${session.agent.signer.did()}`
      ),
    }
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
 * @param {API.SharedSpace} space
 */
export const remove = (session, space) =>
  DB.transact(
    session.agent.db,
    space.proofs.map((proof) => DB.retract({ proof }))
  )

/**
 * @template {API.PlanProtocol & API.UsageProtocol & API.SpaceProtocol & API.AccessProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} session
 * @param {{space:API.DIDKey, name?: string, proof: DB.Link}[]} spaces
 */
const build = (session, spaces) => {
  const { proofs } = session.agent.db
  /** @type {Record<API.DIDKey, {subject: API.DIDKey, signer: API.Signer, name:string, proofs: API.Delegation[]}>} */
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
      }
    } else {
      result[subject].proofs.push(delegation)
    }
  }

  return Object.fromEntries(
    Object.entries(result).map(([k, v]) => [
      k,
      SharedSpace.create(v).connect(session.connection),
    ])
  )
}

/**
 * @implements {API.SpacesSession}
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
   * @param {API.SharedSpace} space
   */
  add(space) {
    return add(this.session, space)
  }
  /**
   * @param {API.SharedSpace} space
   */
  remove(space) {
    return remove(this.session, space)
  }

  *[Symbol.iterator]() {
    yield* Object.values(this.list())
  }

  /**
   *
   * @param {object} source
   * @param {string} source.name
   * @returns {Promise<API.Result<API.OwnSpaceSession<API.W3UpProtocol>, never>>}
   */
  async create(source) {
    return OwnSpace.create(source).connect(this.session.connection)
  }
}

class PrincipalAlignmentError extends Error {
  name = /** @type {const} */ ('PrincipalAlignmentError')
}

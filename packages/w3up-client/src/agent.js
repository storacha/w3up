import * as DB from './agent/db.js'
import { Signer } from '@ucanto/principal'
import { DID } from '@ucanto/core'
import * as KeyPair from '@web3-storage/w3up-client/agent/signer'

import * as API from './types.js'
import * as Session from './session.js'
import * as Connection from './agent/connection.js'
import * as Authorization from './authorization.js'
import * as Task from './task.js'
import * as Memory from './store/memory.js'
export * from './types.js'

export { DB, Connection, DID }

export const ephemeral = Memory.open()

/**
 * @param {API.AgentFrom} source
 */
export const from = (source) =>
  Task.spawn(function* () {
    if (source.create) {
      return yield* create(source.create)
    } else if (source.load) {
      return yield* load(source.load)
    } else if (source.open) {
      return yield* open(source.open)
    } else {
      return Task.fail(new TypeError('Invalid source'))
    }
  })

/**
 * @param {API.AgentOpen} source
 */
export const open = ({ store, as }) =>
  Task.spawn(function* () {
    const db = yield* DB.open({ store })

    if (as) {
      return new Agent({ db, signer: as })
    } else if (db.signer) {
      return new Agent({
        signer: Signer.from(db.signer),
        db,
      })
    } else {
      const signer = yield* Task.wait(KeyPair.generate())

      yield* DB.transact(db, [DB.assert({ signer: signer.toArchive() })])

      return new Agent({ db, signer })
    }
  })

/**
 * @param {API.AgentLoad} source
 */
export const load = ({ store, as }) =>
  Task.spawn(function* () {
    const db = yield* DB.open({ store })

    if (as != null) {
      return new Agent({ db, signer: as })
    } else if (db?.signer != null) {
      const signer = Signer.from(
        /** @type {API.SignerArchive<API.DID, any>} */ (db.signer)
      )

      return new Agent({ db, signer })
    } else {
      return yield* Task.fail(
        new SignerLoadError('Signer key material is not stored in storage')
      )
    }
  })

/**
 * @param {API.AgentCreate} source
 */
export const create = ({ store, as }) =>
  Task.spawn(function* () {
    const db = yield* DB.open({ store })
    let signer = as
    if (!signer) {
      signer = yield* Task.wait(KeyPair.generate())
      const archive = signer.toArchive()
      yield* DB.transact(db, [DB.assert({ signer: archive })])
    }

    return new Agent({ db, signer })
  })

/**
 * @param {API.Agent} agent
 * @param {object} access
 * @param {API.DID} access.subject
 * @param {API.Can} access.can
 * @returns {Task.Task<API.Authorization, API.AccessDenied | Task.AbortError>}
 */
export function* authorize(agent, { subject, can }) {
  const result = Authorization.get(agent.db, {
    authority: agent.signer.did(),
    subject,
    can,
  })

  return yield* Task.ok(result)
}

/**
 * @param {object} source
 * @param {API.Signer<API.DIDKey>} source.signer
 * @param {API.Database} source.db
 * @returns {API.AgentView}
 */
export const view = (source) => new Agent(source)

/**
 * @implements {API.AgentView}
 */
class Agent {
  /**
   * @param {object} source
   * @param {API.Signer<API.DIDKey>} source.signer
   * @param {API.Database} source.db
   */
  constructor(source) {
    this.model = source
  }

  did() {
    return this.model.signer.did()
  }

  get signer() {
    return this.model.signer
  }

  get db() {
    return this.model.db
  }

  /**
   * @param {object} access
   * @param {API.DID} access.subject
   * @param {API.Can} access.can
   */
  authorize(access) {
    return Task.perform(authorize(this, access))
  }

  /**
   * @template {API.UnknownProtocol} Protocol
   * @param {API.Connection<Protocol>} [connection]
   * @returns {API.W3UpSession<Protocol>}
   */
  connect(connection = Connection.open()) {
    return Session.create({ agent: this, connection })
  }
}

class SignerLoadError extends Error {
  name = /** @type {const} */ ('SignerLoadError')
}

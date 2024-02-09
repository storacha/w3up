import * as API from '../types.js'
import * as DB from 'datalogia'
import * as Block from './block.js'
import { importDAG, isDelegation } from '@ucanto/core/delegation'
import * as Association from './db/association.js'
import * as Meta from './meta.js'
import { Capability } from './authorization.js'
import { Delegation } from '@ucanto/core'

/**
 * @param {DB.Term<DB.Link>} ucan
 * @param {DB.Term<string>} issuer
 * @returns
 */
export const issuedBy = (ucan, issuer) =>
  DB.match([ucan, 'ucan/issuer', issuer])

/**
 * @param {DB.Term<DB.Entity>} delegation
 * @param {DB.Term<DB.Entity>} proof
 */
export const hasProof = (delegation, proof) => {
  const principal = DB.string()

  return DB.match([delegation, 'ucan/proof', proof])
    .and(DB.match([delegation, 'ucan/issuer', principal]))
    .and(DB.match([proof, 'ucan/audience', principal]))
}

/**
 * Composes the clause that matches given `ucan` only if it has expired,
 * that is it has `exp` field set and is less than given `query.time`.
 *
 * @param {DB.Term<DB.Entity>} ucan
 * @param {DB.API.Term<DB.Int32>} time
 * @returns {DB.Clause}
 */
export const isExpired = (ucan, time) => {
  const expiration = DB.integer()
  return DB.match([ucan, 'ucan/expiration', expiration]).and(
    DB.Constraint.greater(time, expiration)
  )
}

/**
 *
 * @param {DB.Term<DB.Entity>} ucan
 * @param  {Record<string, DB.Term>} selector
 */
export const hasMeta = (ucan, selector) => {
  const meta = DB.link()
  return DB.match([ucan, 'ucan/meta', meta]).and(Meta.match(meta, selector))
}

/**
 * Composes the clause that will match a `ucan` only if is not active yet,
 * that is it's `nbf` field is set and greater than given `query.time`.
 *
 * @param {DB.Term<DB.Entity>} ucan
 * @param {DB.Term<DB.Int32>} time
 * @returns {DB.Clause}
 */
export const isTooEarly = (ucan, time) => {
  const notBefore = DB.integer()
  return DB.match([ucan, 'ucan/notBefore', notBefore]).and(
    DB.Constraint.less(time, notBefore)
  )
}

/**
 * @param {DB.Term<DB.Entity>} ucan
 * @param {object} constraints
 * @param {DB.Term<DB.Entity>} [constraints.capability]
 * @param {DB.Term<API.UTCUnixTimestamp>} [constraints.time]
 * @param {DB.Term<API.DID>} [constraints.audience]
 */
export const match = (
  ucan,
  { capability = DB.link(), audience = DB.string(), time = DB.integer() }
) =>
  DB.match([ucan, 'ucan/capability', capability])
    .and(DB.match([ucan, 'ucan/audience', audience]))
    .and(DB.not(isExpired(ucan, time)))
    .and(DB.not(isTooEarly(ucan, time)))

/**
 * @param {DB.Term<DB.Entity>} ucan
 * @param {object} constraints
 * @param {DB.Term<DB.Entity>} [constraints.capability]
 * @param {DB.Term<API.UTCUnixTimestamp>} [constraints.time]
 * @param {DB.Term<API.DID>} [constraints.audience]
 * @param {DB.Term<string>} [constraints.can]
 */
export const forwards = (
  ucan,
  { audience = DB.string(), time = DB.integer(), can = DB.string() }
) => {
  const capability = DB.link()
  return Capability.forwards(capability, { can }).and(
    match(ucan, { capability, audience, time })
  )
}

/**
 * Derives set of facts about the given delegation.
 *
 * @param {API.Delegation} delegation
 * @returns {Iterable<DB.Fact>}
 */
export const facts = function* (delegation) {
  const entity = /** @type {API.Link & DB.Entity} */ (delegation.cid)
  yield [entity, 'ucan/issuer', delegation.issuer.did()]
  yield [entity, 'ucan/audience', delegation.audience.did()]
  if (delegation.expiration < Infinity) {
    yield [entity, 'ucan/expiration', delegation.expiration]
  }

  for (const { can, with: uri, nb = {} } of delegation.capabilities) {
    const capability = { with: uri, can, nb }
    const id = DB.Memory.entity(capability)
    yield* Association.assert(capability, { entity: id, path: ['capability'] })
    yield [entity, 'ucan/capability', id]
  }

  // for (const [uri, can] of Object.entries(allows(delegation))) {
  //   for (const [ability, constraints] of Object.entries(can)) {
  //     for (const constraint of /** @type {{}[]} */ (constraints)) {
  //       const capability = {
  //         with: uri,
  //         can: ability,
  //         nb: constraint,
  //       }
  //       const id = DB.Memory.entity(capability)

  //       yield* Association.assert(capability, {
  //         entity: id,
  //         path: ['capability'],
  //       })

  //       yield [entity, 'ucan/capability', id]
  //     }
  //   }
  // }

  for (const fact of delegation.facts) {
    const id = DB.Memory.entity(fact)
    yield* Association.assert(fact, { entity: id, path: ['meta'] })
    yield [entity, 'ucan/meta', id]
  }

  for (const proof of delegation.proofs) {
    if (isDelegation(proof)) {
      yield* facts(proof)

      yield [
        entity,
        'ucan/proof',
        /** @type {API.Link & DB.Entity} */ (proof.cid),
      ]
    } else {
      yield [entity, 'ucan/proof', /** @type {API.Link & DB.Entity} */ (proof)]
    }
  }
}

/**
 * A {@link API.Delegation} formatted for storage, making it compatible with
 * `structuredClone()` used by `indexedDB`.
 *
 * @typedef {Block.Archive[]} Archive
 */

/**
 * Takes {@link Archive} and returns {@link API.Delegation}.
 *
 * @param {Archive} archive
 */
export const fromArchive = (archive) =>
  importDAG(archive.map(Block.fromArchive))

/**
 * Takes {@link API.Delegation} and returns {@link Archive} so it can be stored
 * in the database.
 *
 * @param {API.Delegation} delegation
 * @returns {Archive}
 */
export const toArchive = (delegation) =>
  [...delegation.export()].map(Block.toArchive)

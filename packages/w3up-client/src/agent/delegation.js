import * as API from '../types.js'
import * as DB from 'datalogia'
import * as Block from './block.js'
import { importDAG, allows } from '@ucanto/core/delegation'
import * as Association from './db/association.js'

/**
 * Derives set of facts about the given delegation.
 *
 * @param {API.Delegation} delegation
 * @returns {Iterable<DB.Fact>}
 */
export const assert = function* (delegation) {
  const entity = /** @type {API.Link & DB.Entity} */ (delegation.cid)
  yield [entity, 'ucan/issuer', delegation.issuer.did()]
  yield [entity, 'ucan/audience', delegation.audience.did()]
  if (delegation.expiration < Infinity) {
    yield [entity, 'ucan/expiration', delegation.expiration]
  }

  for (const [uri, can] of Object.entries(allows(delegation))) {
    for (const [ability, constraints] of Object.entries(can)) {
      for (const constraint of /** @type {{}[]} */ (constraints)) {
        const capability = {
          with: uri,
          can: ability,
          nb: constraint,
        }
        const id = DB.Memory.entity(capability)

        yield* Association.assert(capability, {
          entity: id,
          path: ['capability'],
        })

        yield [entity, 'ucan/capability', id]
      }
    }
  }

  for (const fact of delegation.facts) {
    yield* Association.assert(fact, { entity, path: ['ucan', 'fact'] })
  }

  // for (const proof of delegation.proofs) {
  //   if (isDelegation(proof)) {
  //     yield* assert(proof)
  //     yield [
  //       entity,
  //       'ucan/proof',
  //       /** @type {API.Link & DB.Entity} */ (proof.cid),
  //     ]
  //   }
  // }
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

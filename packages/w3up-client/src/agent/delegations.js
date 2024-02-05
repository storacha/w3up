import * as API from '../types.js'
import * as Delegation from './delegation.js'
import * as Datalogia from 'datalogia'

/**
 * @param {Iterable<API.StoredDelegation>} proofs
 * @returns {Iterable<Datalogia.Fact>}
 */
export const facts = function* (proofs) {
  for (const { delegation } of proofs) {
    yield* Delegation.facts(delegation)
  }
}

import * as API from '../types.js'
import { Schema, ok, error, Delegation } from '@ucanto/core'

export { Schema, Delegation } from '@ucanto/core'

export const {
  literal,
  text,
  did,
  link,
  uri,
  integer,
  float,
  boolean,
  uint64,
  struct,
  variant,
  tuple,
  dictionary,
  unknown,
} = Schema
export const now = () => Math.floor(Date.now() / 1000)

/**
 * @template {API.Ability} Ability
 * @extends {Schema.API<Ability, string, Ability>}
 */
class AbilitySchema extends Schema.API {
  /**
   * @param {string} source
   * @param {Ability} ability
   */
  readWith(source, ability) {
    // If same ability then it can be derived
    if (source === ability) {
      return { ok: ability }
    }

    // if source is is wildcard then `ability` can be derived
    if (source === '*') {
      return { ok: ability }
    }

    // Source contains this ability
    if (source.endsWith('/*') && ability.startsWith(source.slice(0, -1))) {
      return { ok: ability }
    }

    return {
      error: new RangeError(
        `Ability '${ability}' can not be derived from '${source}'`
      ),
    }
  }

  /**
   * @param {string} source
   */
  static parse(source) {
    const [namespace, ...segments] = source.split('/')
    return { namespace, segments }
  }
}

/**
 * @param {API.Ability} ability
 */
export const ability = (ability) => new AbilitySchema(ability)

/**
 * @typedef {object} Model
 * @property {Map<string, API.Delegation>} proofs
 */

/**
 * @param {object} source
 * @param {Iterable<API.Delegation>} source.proofs
 * @returns {Model}
 */
export const from = (source) => {
  const proofs = new Map()

  for (const proof of source.proofs) {
    proofs.set(proof.cid.toString(), proof)
  }

  return { proofs }
}

/**
 * Type describes a query that could be used to query ucan store with.
 *
 * @typedef {object} Query
 * @property {API.Reader<API.DID>} [issuer] - Issuer of the delegation.
 * @property {API.Reader<API.DID>} [audience] - Audience of the delegation.
 * @property {API.Reader<API.Schema.Integer>} [expiration] - Expiration time.
 * @property {API.Reader<API.Schema.Integer>} [notBefore] - Not before time.
 * @property {API.Reader<string>} [can] - Ability delegated.
 * @property {API.Reader<API.DID>} [with] - Resource delegated.
 * @property {API.Reader<{}>} [nb] - Caveats of the delegation.
 */

/**
 * @param {Model} model
 * @param {Query} selector
 * @returns {IterableIterator<API.Delegation>}
 */
export const query = function* (model, selector) {
  for (const [, proof] of model.proofs) {
    const result = match(proof, selector)
    if (result.ok) {
      yield result.ok
    }
  }
}

/**
 * Return `proof` if the proof matches given `query` otherwise returns `null`.
 *
 * @template {API.Delegation} Proof
 * @param {Proof} proof
 * @param {Query} query
 * @returns {API.Result<Proof, Error>}
 */
export const match = (
  proof,
  { issuer, audience, expiration, notBefore, can, with: subject, nb }
) => {
  if (issuer) {
    const result = issuer.read(proof.issuer.did())
    if (result.error) {
      return result
    }
  }

  if (audience) {
    const result = audience.read(proof.audience.did())
    if (result.error) {
      return result
    }
  }

  if (expiration) {
    const result = expiration.read(proof.expiration)
    if (result.error) {
      return result
    }
  }

  if (notBefore) {
    const result = notBefore.read(proof.notBefore)
    if (result.error) {
      return result
    }
  }

  const access = Delegation.allows(proof)
  for (const [resource, abilities] of Object.entries(access)) {
    if (subject && !subject.read(resource).ok) {
      continue
    }

    for (const [ability, constraint] of Object.entries(abilities)) {
      if (can && !can.read(ability).ok) {
        continue
      }

      if (
        nb &&
        /** @type {API.Caveats[]} */ (constraint).every(
          (caveats) => nb && !nb.read(caveats).ok
        )
      ) {
        continue
      }

      // If we got this far we found a capability in the current proof that
      // meets the query criteria.
      return ok(proof)
    }
  }

  return error(new RangeError('No matching capability found.'))
}

/**
 * @template {Record<string, API.Reader<unknown>>} Selector
 * @param {Selector} selector
 */
export const select = (selector) => new Select(selector)

/**
 * @template {Record<string, API.Reader<unknown>>} Selector
 * @param {Selector} selector
 */
class Select {
  /**
   *
   * @param {Selector} selector
   */
  constructor(selector) {
    this.selector = selector
  }
  /**
   * @param {Selector} variables
   */
  where(variables) {}
}

/**
 * Triples
 *
 * [cid, issuer, "did:key:zAlice"]
 * [cid, audience, "did:key:zBob"]
 * [cid, expiration, 1702413523]
 * [cid, notBefore, undefined]
 * [cid, can, "store/add"]
 * [cid, with "did:key:zAlice"]
 *
 */

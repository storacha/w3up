import * as DB from 'datalogia'
import * as API from '../types.js'

/**
 * Creates clause that matches `query.capability` only if
 * it has `query.ability`.
 *
 * @param {DB.Term<DB.Entity>} capability
 * @param {string} can
 */
export const hasAbility = (capability, can) => {
  const ability = DB.string()
  return DB.match([capability, 'capability/can', ability]).and(
    // can is a glob pattern that we try to match against
    // ability - store/*
    // can - store/add
    DB.glob(can, ability)
  )
}

/**
 * Returns capability that matches given constraints, specifically that it is
 * for the given subject and poses `constraint.can` ability.
 *
 * @param {DB.Term<DB.Entity>} capability
 * @param {object} constraints
 * @param {DB.Term<API.DID>} constraints.subject
 * @param {string} constraints.can
 */
export const match = (capability, { subject, can }) =>
  DB.match([capability, 'capability/with', subject]).and(
    hasAbility(capability, can)
  )

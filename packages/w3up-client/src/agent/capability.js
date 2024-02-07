import * as DB from 'datalogia'
import * as API from '../types.js'

/**
 * Creates clause that matches `query.capability` only if
 * it has `query.ability`.
 *
 * @param {DB.Term<DB.Entity>} capability
 * @param {string} can
 */
export const matchAbility = (capability, can) => {
  const ability = DB.string()
  return DB.match([capability, 'capability/can', ability]).and(
    // can is a glob pattern that we try to match against
    // ability - store/*
    // can - store/add
    DB.glob(can, ability)
  )
}

/**
 * Creates clause that matches `query.capability` only if
 * it has `query.ability`.
 *
 * @param {DB.Term<DB.Entity>} capability
 * @param {DB.Term<string>} can
 */
export const hasAbility = (capability, can) =>
  DB.match([capability, 'capability/can', can])

/**
 * Creates clause that matches `capability` only if it has `query.subject`.
 *
 * @param {DB.Term<DB.Entity>} capability
 * @param {DB.Term<string>} subject
 */
export const hasSubject = (capability, subject) =>
  DB.match([capability, 'capability/with', subject])

/**
 * Returns capability that matches given constraints, specifically that it is
 * for the given subject and poses `constraint.can` ability.
 *
 * @param {DB.Term<DB.Entity>} capability
 * @param {object} constraints
 * @param {DB.Term<string>} constraints.subject
 * @param {DB.Term<string>} constraints.can
 */
export const match = (capability, { subject, can }) =>
  hasSubject(capability, subject).and(hasAbility(capability, can))

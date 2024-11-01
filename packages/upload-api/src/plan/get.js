import * as API from '../types.js'
import * as Provider from '@ucanto/server'
import { Plan } from '@storacha/capabilities'

/**
 * @param {API.PlanServiceContext} context
 */
export const provide = (context) =>
  Provider.provide(Plan.get, (input) => get(input, context))

/**
 * @param {API.Input<Plan.get>} input
 * @param {API.PlanServiceContext} context
 * @returns {Promise<API.Result<API.PlanGetSuccess, API.PlanGetFailure>>}
 */
const get = async ({ capability }, context) => {
  return context.plansStorage.get(capability.with)
}

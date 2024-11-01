import * as API from '../types.js'
import * as Provider from '@ucanto/server'
import { Plan } from '@storacha/capabilities'

/**
 * @param {API.PlanServiceContext} context
 */
export const provide = (context) =>
  Provider.provide(Plan.set, (input) => set(input, context))

/**
 * @param {API.Input<Plan.set>} input
 * @param {API.PlanServiceContext} context
 * @returns {Promise<API.Result<API.PlanSetSuccess, API.PlanSetFailure>>}
 */
const set = async ({ capability }, context) => {
  return context.plansStorage.set(capability.with, capability.nb.product)
}

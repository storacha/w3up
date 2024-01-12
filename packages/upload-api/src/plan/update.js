import * as API from '../types.js'
import * as Provider from '@ucanto/server'
import { Plan } from '@web3-storage/capabilities'

/**
 * @param {API.PlanServiceContext} context
 */
export const provide = (context) =>
  Provider.provide(Plan.update, (input) => update(input, context))

/**
 * @param {API.Input<Plan.update>} input
 * @param {API.PlanServiceContext} context
 * @returns {Promise<API.Result<API.PlanUpdateSuccess, API.PlanUpdateFailure>>}
 */
const update = async ({ capability }, context) => {
  return context.plansStorage.update(capability.with, capability.nb.product)
}

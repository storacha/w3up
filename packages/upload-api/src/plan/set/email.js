import * as API from '../../types.js'
import * as Provider from '@ucanto/server'
import { Plan } from '@web3-storage/capabilities'

/**
 * @param {API.PlanServiceContext} context
 */
export const provide = (context) =>
  Provider.provide(Plan.setEmail, (input) => set(input, context))

/**
 * @param {API.Input<Plan.setEmail>} input
 * @param {API.PlanServiceContext} context
 * @returns {Promise<API.Result<API.PlanSetEmailSuccess, API.PlanSetEmailFailure>>}
 */
const set = async ({ capability }, context) => {
  return context.plansStorage.setEmail(capability.with, capability.nb.email)
}

import * as API from '../types.js'
import * as Provider from '@ucanto/server'
import { Plan } from '@storacha/capabilities'

/**
 * @param {API.PlanServiceContext} context
 */
export const provide = (context) =>
  Provider.provide(Plan.createAdminSession, (input) =>
    createAdminSession(input, context)
  )

/**
 * @param {API.Input<Plan.createAdminSession>} input
 * @param {API.PlanServiceContext} context
 * @returns {Promise<API.Result<API.PlanCreateAdminSessionSuccess, API.PlanCreateAdminSessionFailure>>}
 */
const createAdminSession = async ({ capability }, context) =>
  context.plansStorage.createAdminSession(
    capability.with,
    capability.nb.returnURL
  )

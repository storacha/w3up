import * as API from '../api.js'
import * as Has from './consumer/has.js'

/**
 * @param {API.RouteContext} context
 */
export const provide = (context) => ({
  has: Has.provide(context),
})

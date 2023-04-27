import * as API from '../api.js'
import * as Add from './provider-add.js'

/**
 * @param {API.RouteContext} context
 */
export const provide = (context) => ({
  add: Add.provide(context),
})

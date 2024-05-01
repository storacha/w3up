import { provide } from './index/add.js'
import * as API from './types.js'

/** @param {API.IndexServiceContext} context */
export const createService = (context) => ({ add: provide(context) })

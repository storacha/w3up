import { JSONResponse } from '../utils/responses.js'

/**
 * @param {FetchEvent} event
 */
export function version(event) {
  return new JSONResponse({
    version: VERSION,
    commit: COMMITHASH,
    branch: BRANCH,
  })
}

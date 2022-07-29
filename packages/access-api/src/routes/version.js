import { JSONResponse } from '@web3-storage/worker-utils/response'

/**
 * @param {import('@web3-storage/worker-utils/router').ParsedRequest} event
 * @param {import('../bindings.js').RouteContext} env
 */
export function version(event, env) {
  return new JSONResponse({
    version: env.config.VERSION,
    commit: env.config.COMMITHASH,
    branch: env.config.BRANCH,
    did: env.keypair.did(),
  })
}

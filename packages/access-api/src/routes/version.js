import { JSONResponse } from '@web3-storage/worker-utils/response'

/** @type {import('../bindings.js').Handler} */
export async function version(event, env, ctx) {
  return new JSONResponse({
    version: env.config.VERSION,
    commit: env.config.COMMITHASH,
    branch: env.config.BRANCH,
    did: env.config.ucantoServerId.did(),
    signer: env.signer.did(),
  })
}

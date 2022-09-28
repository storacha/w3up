import { JSONResponse } from '@web3-storage/worker-utils/response'
/**
 * @param {import('@web3-storage/worker-utils/router').ParsedRequest} event
 * @param {import('../bindings.js').RouteContext} env
 */
export async function version(event, env) {
  // const inserted = await env.db.insert({
  //   tableName: 'accounts',
  //   data: {
  //     did: 'did:key:ztest',
  //     product: 'free',
  //     email: 'hugomrdias@gmail.com',
  //     agent: 'did:key:zagent',
  //   },
  //   returning: '*',
  // })
  // console.log('🚀 ~ file: version.js ~ line 15 ~ version ~ inserted', inserted)
  // console.log(new Date(inserted.results[0].inserted_at).toISOString())
  return new JSONResponse({
    version: env.config.VERSION,
    commit: env.config.COMMITHASH,
    branch: env.config.BRANCH,
    did: env.keypair.did(),
  })
}

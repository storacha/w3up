import * as Server from '@ucanto/server'
import { serverCodec } from '../ucanto/server-codec.js'
import { service } from '../service/index.js'

/**
 * @param {import('@web3-storage/worker-utils/router').ParsedRequest} request
 * @param {import('../bindings.js').RouteContext} env
 */
export async function postRaw(request, env) {
  const server = Server.create({
    id: env.config.ucantoServerId,
    encoder: serverCodec,
    decoder: serverCodec,
    service: service(env),
    catch: (/** @type {string | Error} */ err) => {
      env.log.error(err)
    },
  })

  const rsp = await server.request({
    body: new Uint8Array(await request.arrayBuffer()),
    headers: Object.fromEntries(request.headers.entries()),
  })
  return new Response(rsp.body, { headers: rsp.headers })
}

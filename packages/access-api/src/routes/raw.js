import * as Server from '@ucanto/server'
import { serverCodec } from '../ucanto/server-codec.js'
import { service } from '../service/index.js'

// https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent
/** @typedef {{ waitUntil(p: Promise<any>): void }} Ctx */

/**
 * @param {import('@web3-storage/worker-utils/router').ParsedRequest} request
 * @param {import('../bindings.js').RouteContext} env
 * @param {Ctx} ctx
 */
export async function postRaw(request, env, ctx) {
  const server = Server.create({
    id: env.signer,
    encoder: serverCodec,
    decoder: serverCodec,
    service: service(env),
    catch: (/** @type {string | Error} */ err) => {
      env.log.error(err)
    },
  })

  const body = new Uint8Array(await request.arrayBuffer())
  const rsp = await server.request({
    body,
    headers: Object.fromEntries(request.headers.entries()),
  })

  // Process CAR with invocations asynchronously
  ctx.waitUntil(
    (async () => {
      await fetch(new URL('/ucan', env.uploadApiUrl), {
        method: 'POST',
        headers: {
          Authorization: `Basic ${env.ucanInvocationPostBasicAuth}`,
        },
        body,
      })
    })()
  )

  return new Response(rsp.body, { headers: rsp.headers })
}

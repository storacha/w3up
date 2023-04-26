import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import { service } from '../service/index.js'
import { serverCodec as json } from '../ucanto/server-codec.js'
import * as API from '../bindings.js'

/**
 * @param {import('@web3-storage/worker-utils/router').ParsedRequest} request
 * @param {API.RouteContext} env
 * @param {API.HandlerContext} ctx
 *
 */
export async function postRoot(request, env, ctx) {
  const server = Server.create({
    id: env.signer,
    codec: CAR.inbound,
    service: service(env),
    catch: (/** @type {string | Error} */ err) => {
      env.log.error(err)
    },
  })

  const body = new Uint8Array(await request.arrayBuffer())
  /** @type {Readonly<Record<string, string>>} */
  const headers = Object.fromEntries(request.headers.entries())

  // We will use different codec based on the content-type header
  // this way we do not need to have separate routes.
  const codec = headers['content-type'] === CAR.contentType ? CAR.request : json

  // @ts-expect-error matching signatures are incompatible
  const message = await codec.decode({
    body,
    headers,
  })

  const inMessage = CAR.request.encode(message, {
    headers,
  })

  // We block until we can log the UCAN invocation if this fails we return a 500
  // to the client. That is because in the future we expect that invocations will
  // be written to a queue first and then processed asynchronously, so if we
  // fail to queue the invocation we should not handle it.
  await env.ucanLog.log(inMessage)

  const result = await Server.execute(message, server)
  // @ts-expect-error matching signatures are incompatible
  const outMessage = codec.encode(result)

  ctx.waitUntil(env.ucanLog.log(outMessage))

  return new Response(outMessage.body, {
    headers: outMessage.headers,
  })
}

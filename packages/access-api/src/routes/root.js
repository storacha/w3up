import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import { service } from '../service/index.js'
import * as API from '../bindings.js'
import { serverCodec as json } from '../ucanto/server-codec.js'

/**
 * @param {import('@web3-storage/worker-utils/router').ParsedRequest} request
 * @param {API.RouteContext} env
 * @param {API.HandlerContext} ctx
 *
 */
export async function postRoot(request, env, ctx) {
  const server = Server.create({
    id: env.signer,
    encoder: CBOR,
    decoder: CAR,
    service: service(env),
    catch: (/** @type {string | Error} */ err) => {
      env.log.error(err)
    },
  })

  const body = new Uint8Array(await request.arrayBuffer())
  const headers = Object.fromEntries(request.headers.entries())

  /** @type {[Server.RequestDecoder, Server.ResponseEncoder]} */
  // We will use encoder / decoder pair based on the content-type header this
  // way we do not need to have separate routes.
  const [decoder, encoder] =
    headers['content-type'] === 'application/car' ? [CAR, CBOR] : [json, json]

  const invocations = await decoder.decode({
    body,
    headers: Object.fromEntries(request.headers.entries()),
  })

  // We block until we can log the UCAN invocation if this fails we return a 500
  // to the client. That is because in the future we expect that invocations will
  // be written to a queue first and then processed asynchronously, so if we
  // fail to queue the invocation we should not handle it.
  await env.ucanLog.logInvocations(body)

  const results = await Promise.all(
    invocations.map((invocation) => execute(invocation, server, env))
  )

  const forks = []
  const out = []

  for (const receipt of results) {
    out.push(receipt.data.out.error || receipt.data.out.ok)
    // we don't await the logReceipt call because we want to return the response
    // to the client as soon as possible. We will however keep the worker alive
    // until we have logged the receipt. If logging fails we will log the error
    // as we have no way to handle it here nor we can rollback the invocation.
    forks.push(
      env.ucanLog.logReceipt(receipt).catch((error) => env.log.error(error))
    )
  }

  const response = await encoder.encode(out)

  ctx.waitUntil(Promise.all(forks))

  return new Response(response.body, {
    headers: response.headers,
  })
}

/**
 *
 * @param {Server.Invocation} invocation
 * @param {Server.ServerView<*>} server
 * @param {API.RouteContext} env
 * @returns {Promise<Required<API.Block<API.Receipt>>>}
 */
const execute = async (invocation, server, env) => {
  /** @type {[Server.Result<*, Server.API.Failure>]} */
  const [result] = await Server.execute([invocation], server)
  const out = result?.error ? { error: result } : { ok: result }

  // Create a receipt payload for the invocation conforming to the spec
  // @see https://github.com/ucan-wg/invocation/#8-receipt
  const payload = {
    ran: invocation.cid,
    out,
    fx: { fork: [] },
    meta: {},
    iss: env.signer.did(),
    prf: [],
  }

  // create a receipt by signing the payload with a server key
  const receipt = {
    ...payload,
    s: await env.signer.sign(CBOR.codec.encode(payload)),
  }

  return {
    data: receipt,
    ...(await CBOR.codec.write(receipt)),
  }
}

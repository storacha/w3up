import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import { service } from '../service/index.js'

/**
 * @param {import('@web3-storage/worker-utils/router').ParsedRequest} request
 * @param {import('../bindings.js').RouteContext} env
 */
export async function postRoot(request, env) {
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
  const invocations = await server.decoder.decode({
    body,
    headers: Object.fromEntries(request.headers.entries()),
  })

  const [, ...results] = await Promise.all([
    env.ucanLog.logInvocations(body),
    ...invocations.map((invocation) => execute(invocation, server, env)),
  ])

  const response = await server.encoder.encode(results)
  return new Response(response.body, {
    headers: response.headers,
  })
}

/**
 *
 * @param {Server.Invocation} invocation
 * @param {Server.ServerView<*>} server
 * @param {import('../bindings.js').RouteContext} env
 * @returns {Promise<Server.Result<unknown, Server.API.Failure>>}
 */
const execute = async (invocation, server, env) => {
  /** @type {[Server.Result<*, Server.API.Failure>]} */
  const [result] = await Server.execute([invocation], server)
  const out = result?.error ? { error: result } : { ok: result }

  // Create a receipt payload for the invocation conforming to the spec
  // @see https://github.com/ucan-wg/invocation/#8-receipt
  const payload = {
    run: invocation.cid,
    out,
    fx: { fork: [] },
    meta: {},
    iss: env.signer.did(),
    prf: [],
  }
  // create a receipt by signing the payload with a server key
  const receipt = CBOR.codec.encode({
    ...payload,
    s: await env.signer.sign(CBOR.codec.encode(payload)),
  })
  // Send the receipt to the ucan log. Notice that if this fails, the the whole
  // batch of invocations may fail but there is no way to do a better handling
  // at this layer. It is up to the `ucanLog` to handle IO errors.
  await env.ucanLog.logReceipt(receipt)
  // then we just return the result as is.
  return result
}

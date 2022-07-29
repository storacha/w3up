import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import { version } from './routes/version.js'
import { serverCodec } from './ucanto/server-codec.js'
import { service } from './ucanto/service.js'
import { getContext } from './utils/context.js'

import { corsHeaders, preflight } from '@web3-storage/worker-utils/cors'
import { errorHandler } from '@web3-storage/worker-utils/error'
import { notFound } from '@web3-storage/worker-utils/response'
import { Router } from '@web3-storage/worker-utils/router'

/** @type Router<import('./bindings.js').RouteContext> */
const r = new Router({ onNotFound: notFound })
r.add('options', '*', preflight)
r.add('get', '/version', version)
r.add('post', '/', async (request, env) => {
  const server = Server.create({
    id: env.keypair,
    encoder: CBOR,
    decoder: CAR,
    service: service(env),
    catch: (/** @type {string | Error} */ err) => {
      env.log.error(err)
    },
    canIssue: (
      /** @type {{ with: any; can: string; }} */ capability,
      /** @type {import("@ucanto/interface").DID<unknown>} */ issuer
    ) => {
      if (capability.with === issuer || issuer === env.keypair.did()) {
        return true
      }

      if (capability.can === 'identity/validate') {
        return true
      }

      return false
    },
  })

  const rsp = await server.request({
    body: new Uint8Array(await request.arrayBuffer()),
    headers: Object.fromEntries(request.headers.entries()),
  })
  return new Response(rsp.body, { headers: rsp.headers })
})

r.add('post', '/raw', async (request, env) => {
  const server = Server.create({
    id: env.keypair,
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
})

addEventListener('fetch', (event) => {
  const env = getContext(event, {})
  env.log.time('request')
  event.respondWith(
    r
      .handle(event, env)
      .then((rsp) => {
        env.log.timeEnd('request')
        return env.log.end(corsHeaders(event.request, rsp))
      })
      .catch((error) => {
        return errorHandler(error, env.log)
      })
  )
})

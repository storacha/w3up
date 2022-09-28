import { corsHeaders, preflight } from '@web3-storage/worker-utils/cors'
import { errorHandler } from '@web3-storage/worker-utils/error'
import { notFound } from '@web3-storage/worker-utils/response'
import { Router } from '@web3-storage/worker-utils/router'
import { postRaw } from './routes/raw.js'
import { postRoot } from './routes/root.js'
import { validateEmail } from './routes/validate-email.js'
import { validateWS } from './routes/validate-ws.js'
import { validate } from './routes/validate.js'
import { version } from './routes/version.js'
import { getContext } from './utils/context.js'

/** @type Router<import('./bindings.js').RouteContext> */
const r = new Router({ onNotFound: notFound })

r.add('options', '*', preflight)
r.add('get', '/version', version)
r.add('get', '/validate', validate)
r.add('get', '/validate-email', validateEmail)
r.add('get', '/validate-ws', validateWS)
r.add('post', '/', postRoot)
r.add('post', '/raw', postRaw)

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
        return env.log.end(
          corsHeaders(event.request, errorHandler(error, env.log))
        )
      })
  )
})

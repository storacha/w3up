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

/** @type {import('./bindings.js').ModuleWorker} */
const worker = {
  fetch: async (request, env, ctx) => {
    const context = getContext(request, env, ctx)
    context.log.time('request')
    try {
      const rsp = await r.fetch(request, context, ctx)
      return context.log.end(corsHeaders(request, rsp))
    } catch (error) {
      return context.log.end(
        corsHeaders(
          request,
          errorHandler(/** @type {Error} */ (error), context.log)
        )
      )
    }
  },
}

export default worker

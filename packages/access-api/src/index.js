import { corsHeaders, preflight } from '@web3-storage/worker-utils/cors'
import { errorHandler } from '@web3-storage/worker-utils/error'
import { notFound } from '@web3-storage/worker-utils/response'
import { Router } from '@web3-storage/worker-utils/router'
import { postRaw } from './routes/raw.js'
import { postRoot } from './routes/root.js'
import { validateEmail } from './routes/validate-email.js'
import { validateWS } from './routes/validate-ws.js'
import { version } from './routes/version.js'
import { getContext } from './utils/context.js'
import { generateNoncePhrase } from './utils/phrase.js'

/** @type Router<import('./bindings.js').RouteContext> */
const r = new Router({ onNotFound: notFound })

r.add('options', '*', preflight)
r.add('get', '/version', version)
r.add('get', '/phrase-test', phraseTest)
r.add('get', '/validate-email', validateEmail)
r.add('get', '/validate-ws', validateWS)
r.add('post', '/', postRoot)
r.add('post', '/raw', postRaw)
r.add('get', '/reproduce-cloudflare-error', reproduceCloudflareError)

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

/**
 * @param {import('@web3-storage/worker-utils/router').ParsedRequest} request
 * @returns
 */
async function reproduceCloudflareError(request) {
  const fetchUrl = request.query.url || 'https://up.web3.storage'
  let fetchedResponse
  try {
    fetchedResponse = await fetch(fetchUrl)
  } catch (error) {
    const message = `/reproduce-cloudflare-error fetch ${fetchUrl} threw unexpected error: ${error}`
    // eslint-disable-next-line no-console
    console.error(message, error)
    return new Response(JSON.stringify({ message }, undefined, 2), {
      status: 500,
    })
  }
  const response = {
    message: `got response from fetching ${fetchUrl}`,
    response: {
      status: fetchedResponse.status,
      statusText: fetchedResponse.statusText,
    },
  }
  return new Response(JSON.stringify(response, undefined, 2), { status: 200 })
}

/**
 * @param {import('@web3-storage/worker-utils/router').ParsedRequest} request
 * @param {import('./bindings.js').RouteContext} env
 */
async function phraseTest(request, env) {
  const entropy = Number(request.query.bits) || 42
  return new Response(generateNoncePhrase(entropy), { status: 200 })
}

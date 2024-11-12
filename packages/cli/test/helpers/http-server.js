import http from 'node:http'
import { once } from 'node:events'

/**
 * @typedef {import('@ucanto/interface').HTTPRequest<any>} HTTPRequest
 * @typedef {import('@ucanto/server').HTTPResponse<any>} HTTPResponse
 * @typedef {Record<string, (input:HTTPRequest) => PromiseLike<HTTPResponse>|HTTPResponse>} Router
 *
 * @typedef {{
 *   server: http.Server
 *   serverURL: URL
 *   router: Router
 * }} TestingServer
 */

/**
 * @param {Router} router
 * @returns {Promise<TestingServer>}
 */
export async function createServer(router) {
  /**
   * @param {http.IncomingMessage} request
   * @param {http.ServerResponse} response
   */
  const listener = async (request, response) => {
    const chunks = []
    for await (const chunk of request) {
      chunks.push(chunk)
    }

    const handler = router[request.url ?? '/']
    if (!handler) {
      response.writeHead(404)
      response.end()
      return undefined
    }

    const { headers, body } = await handler({
      headers: /** @type {Readonly<Record<string, string>>} */ (
        request.headers
      ),
      body: Buffer.concat(chunks),
    })

    response.writeHead(200, headers)
    response.write(body)
    response.end()
    return undefined
  }

  const server = http.createServer(listener).listen()

  await once(server, 'listening')

  return {
    server,
    router,
    // @ts-expect-error
    serverURL: new URL(`http://127.0.0.1:${server.address().port}`),
  }
}

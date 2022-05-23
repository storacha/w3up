export class JSONResponse extends Response {
  /**
   *
   * @param {unknown} body
   * @param {ResponseInit} [init]
   */
  constructor(body, init = {}) {
    const headers = {
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
    }
    super(JSON.stringify(body), { ...init, ...headers })
  }
}

/**
 * Try to serve static assets or the 404 page
 *
 * @param {FetchEvent} _event
 */
export async function notFound(_event) {
  return new Response('404 not found', { status: 404 })
}

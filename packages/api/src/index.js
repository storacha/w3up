/**
 *
 * @param {Request} request
 * @returns
 */
async function handleRequest(request) {
  return new Response(JSON.stringify({ msg: 'hello world!' }), {
    headers: {
      'content-type': 'application/json;charset=UTF-8',
    },
  })
}

addEventListener('fetch', (/** @type {FetchEvent} */ event) => {
  return event.respondWith(handleRequest(event.request))
})

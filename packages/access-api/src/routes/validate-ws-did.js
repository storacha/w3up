/**
 * @param {import('@web3-storage/worker-utils/router').ParsedRequest} req
 * @param {import('../bindings.js').RouteContext} env
 */
export async function validateWSDID(req, env) {
  const durableObjectID = env.spaceVerifiers.idFromName(req.params.did)
  const durableObject = env.spaceVerifiers.get(durableObjectID)
  const response = await durableObject.fetch(req)
  // wrap the response because it's not possible to set headers on the response we get back from the durable object
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    webSocket: response.webSocket,
  })
}

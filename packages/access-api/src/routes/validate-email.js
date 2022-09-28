/**
 * @param {import('@web3-storage/worker-utils/router').ParsedRequest} req
 * @param {import('../bindings.js').RouteContext} env
 */
export async function validateEmail(req, env) {
  if (req.query && req.query.ucan && req.query.did) {
    // TODO parse and set KV ttl to delegation ttl

    await env.config.VALIDATIONS.put(req.query.did, req.query.ucan)

    return new Response('Done')
  }

  throw new Error('needs ucan or did query')
}

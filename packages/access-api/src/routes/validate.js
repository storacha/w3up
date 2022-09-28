import { Validations } from '../kvs/validations.js'

/**
 * @param {import('@web3-storage/worker-utils/router').ParsedRequest} req
 * @param {import('../bindings.js').RouteContext} env
 */
export async function validate(req, env) {
  const validations = new Validations()
  if (req.query && req.query.ucan) {
    await validations.create(req.query.ucan)

    return new Response('Success', {
      status: 307,
      headers: { location: 'https://web3.storage/' },
    })
  }

  if (req.query && req.query.did) {
    const ucan = await validations.get(req.query.did)
    await validations.delete(req.query.did)
    return new Response(ucan)
  }

  throw new Error('needs ucan or did query')
}

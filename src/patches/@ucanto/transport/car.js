import * as API from '@ucanto/interface'
import * as CAR from './car/codec.js'
import { Delegation } from '@ucanto/core'

export { CAR as codec }

const HEADERS = Object.freeze({
  'content-type': 'application/car',
})

/**
 * Encodes invocation batch into an HTTPRequest.
 *
 * @template {API.Tuple<API.IssuedInvocation>} I
 * @param {I} invocations
 * @param {API.EncodeOptions} [options]
 * @returns {Promise<API.HTTPRequest<I>>}
 */
export const encode = async (invocations, options) => {
  const roots = []
  const blocks = new Map()
  for (const invocation of invocations) {
    const delegation = await Delegation.delegate(invocation, options)
    roots.push(delegation.root)
    for (const block of delegation.export()) {
      blocks.set(block.cid.toString(), block)
    }
    blocks.delete(delegation.root.cid.toString())
  }
  const body = CAR.encode({ roots, blocks })

  return {
    headers: HEADERS,
    body,
  }
}

/**
 * Decodes HTTPRequest to an invocation batch.
 *
 * @template {API.Tuple<API.IssuedInvocation>} Invocations
 * @param {API.HTTPRequest<Invocations>} request
 * @returns {Promise<API.InferInvocations<Invocations>>}
 */
export const decode = async ({ headers, body }) => {
  const contentType = headers['content-type'] || headers['Content-Type']
  if (contentType !== 'application/car') {
    throw TypeError(
      `Only 'content-type: application/car' is supported, intsead got '${contentType}'`
    )
  }

  const { roots, blocks } = await CAR.decode(body)

  const invocations = []

  for (const root of /** @type {API.Block[]} */ (roots)) {
    invocations.push(
      Delegation.create({
        root,
        blocks: /** @type {Map<string, API.Block>} */ (blocks),
      })
    )
  }

  return /** @type {API.InferInvocations<Invocations>} */ (invocations)
}

import { Message, Delegation } from '@ucanto/core'
import * as UCAN from '@ipld/dag-ucan'
import { UTF8 } from '@ucanto/transport'
import { HTTPError } from '@web3-storage/worker-utils/error'

export const contentType = 'application/json'

const HEADERS = Object.freeze({
  'content-type': 'application/json',
})

/**
 * Split multi value headers into an array
 *
 * @param {Headers} headers
 * @param {string} name
 */
function multiValueHeader(headers, name) {
  const out = headers
    .get(name)
    ?.split(',')
    .map((v) => v.trimStart())

  return out || []
}

/**
 * @param {Record<string, string> | Headers} headers
 */
async function parseHeaders(headers) {
  const h = new Headers(headers)

  try {
    /** @type Map<string,UCAN.Block> */
    const proofs = new Map()
    const proofsRaw = multiValueHeader(h, 'ucan')

    for (const cidUcan of proofsRaw) {
      const [cid, ucan] = cidUcan.trim().split(/\s+/)
      const ucanView = UCAN.parse(/** @type {UCAN.JWT<any>} */ (ucan))
      const block = await UCAN.write(ucanView)

      if (cid !== block.cid.toString()) {
        throw new TypeError(
          `Invalid request, proof with cid ${block.cid.toString()} has mismatching cid ${cid} in the header`
        )
      }

      proofs.set(cid, block)
    }

    /** @type {UCAN.View<any>[]} */
    const ucans = []
    const auths = multiValueHeader(h, 'Authorization')

    for (const auth of auths) {
      if (auth.toLowerCase().startsWith('bearer ')) {
        const ucanView = UCAN.parse(
          /** @type {UCAN.JWT<any>} */ (auth.slice(7))
        )
        ucans.push(ucanView)
      }
    }

    return { proofs, ucans }
  } catch (error) {
    throw new HTTPError('Malformed UCAN headers data.', {
      status: 401,
      cause: /** @type {Error} */ (error),
    })
  }
}

/**
 * Decodes `AgentMessage` from the received `HTTPRequest`.
 *
 * @template {import('@ucanto/interface').AgentMessage} Message
 * @param {import('@ucanto/interface').HTTPRequest<Message>} request
 * @returns {Promise<Message>}
 */
export const decode = async ({ body, headers }) => {
  const headersData = await parseHeaders(headers)
  if (headersData.ucans.length === 0) {
    throw new HTTPError(
      'The required "Authorization: Bearer" header is missing.',
      { status: 400 }
    )
  }

  const invocations = []

  // Iterate ucan invocations from the headers
  for (const ucanView of headersData.ucans) {
    const blocks = new Map()
    const missing = []

    // Check all the proofs for each invocation
    for (const proofCID of ucanView.proofs) {
      const proof = headersData.proofs.get(proofCID.toString())
      if (!proof) {
        missing.push(proofCID.toString())
      }

      blocks.set(proofCID.toString(), proof)
      // TODO implement caching of proofs https://github.com/ucan-wg/ucan-as-bearer-token#32-cache-and-expiry
    }

    if (missing.length > 0) {
      throw new HTTPError('Missing Proofs', {
        status: 510,
        // @ts-ignore - Error.cause type is a mess
        cause: { prf: missing },
      })
    }

    // Build the full ucan chain for each invocation from headers data
    invocations.push(
      Delegation.create({ root: await UCAN.write(ucanView), blocks })
    )
  }

  // @ts-expect-error TODO invocations incompatible
  const message = await Message.build({ invocations })
  return /** @type {Message} */ (message)
}

/**
 * Encodes `AgentMessage` into an `HTTPRequest`.
 *
 * @template {import('@ucanto/interface').AgentMessage} Message
 * @param {Message} message
 * @returns {import('@ucanto/interface').HTTPRequest<Message>}
 */
export const encode = (message) => {
  /** @type {Record<string, any>} */
  const outs = {}
  for (const receipt of message.receipts.values()) {
    outs[receipt.ran.link().toString()] = receipt.out
  }

  return {
    headers: Object.fromEntries(new Headers(HEADERS).entries()),
    body: UTF8.encode(JSON.stringify(outs)),
  }
}

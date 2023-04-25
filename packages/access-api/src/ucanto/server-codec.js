import { Message } from '@ucanto/core'
import * as UCAN from '@ipld/dag-ucan'
import { UTF8 } from '@ucanto/transport'
import { HTTPError } from '@web3-storage/worker-utils/error'

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

/** @type {import('./types.js').ServerCodec} */
export const serverCodec = {
  /**
   * Decodes `AgentMessage` from the received `HTTPRequest`.
   *
   * @template {import('@ucanto/interface').AgentMessage} Message
   * @param {import('@ucanto/interface').HTTPRequest<Message>} request
   * @returns {Promise<Message>}
   */
  async decode({ body, headers }) {
    const headersData = await parseHeaders(headers)
    if (headersData.ucans.length === 0) {
      throw new HTTPError(
        'The required "Authorization: Bearer" header is missing.',
        { status: 400 }
      )
    }

    let root
    const blocks = new Map()

    // Iterate ucan invocations from the headers
    for (const ucanView of headersData.ucans) {
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

      if (!root) {
        root = (await UCAN.write(ucanView)).cid
      }
    }

    if (!root) {
      throw new Error('Missing root')
    }

    const message = Message.view({ root, store: blocks })
    return /** @type {Message} */ (message)
  },

  /**
   * Encodes `AgentMessage` into an `HTTPRequest`.
   *
   * @template {import('@ucanto/interface').AgentMessage} Message
   * @param {Message} message
   * @returns {import('@ucanto/interface').HTTPRequest<Message>}
   */
  encode(message) {
    return {
      headers: Object.fromEntries(new Headers(HEADERS).entries()),
      body: UTF8.encode(JSON.stringify(message)),
    }
  },
}

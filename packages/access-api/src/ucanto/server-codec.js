import { Delegation } from '@ucanto/core'
import * as UCAN from '@ipld/dag-ucan'
import { UTF8 } from '@ucanto/transport'
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'

const HEADERS = Object.freeze({
  'content-type': 'application/json',
})

/** @type {import('./types.js').ServerCodec} */
export const serverCodec = {
  /**
   * Decode Request
   *
   * @template {Types.Tuple<Types.IssuedInvocation>} I
   * @param {Types.HTTPRequest<I>} request
   */
  async decode({ body, headers }) {
    const bearer = headers.authorization || ''
    if (!bearer.toLowerCase().startsWith('bearer ')) {
      throw Object.assign(new Error('bearer missing.'), {
        status: 400,
      })
    }

    const jwt = bearer.slice(7)
    const invocations = []
    try {
      const data = UCAN.parse(/** @type {UCAN.JWT<any>} */ (jwt))
      const root = await UCAN.write(data)

      invocations.push(Delegation.create({ root }))
      return /** @type {Types.InferInvocations<I>} */ (invocations)
    } catch (error) {
      throw Object.assign(
        new Error('Invalid JWT.', { cause: /** @type {Error} */ (error) }),
        {
          status: 400,
        }
      )
    }
  },

  /**
   * Encode Response
   *
   * @template I
   * @param {I} result
   * @returns {Types.HTTPResponse<I>}
   */
  encode(result) {
    return {
      headers: HEADERS,
      body: UTF8.encode(JSON.stringify(result)),
    }
  },
}

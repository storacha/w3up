import * as UCAN from '@ipld/dag-ucan'
import { UTF8 } from '@ucanto/transport'

/** @type {import('./types.js').ClientCodec} */
export const clientCodec = {
  async encode(invocations, options) {
    const headers = new Headers()
    const chain = await invocations[0].delegate()

    // TODO iterate over proofs and send them too
    // for (const ucan of chain.iterate()) {
    //   //
    // }

    headers.set('authorization', `bearer ${UCAN.format(chain.data)}`)
    return {
      headers: Object.fromEntries(headers.entries()),
      body: new Uint8Array(),
    }
  },

  decode({ headers, body }) {
    return JSON.parse(UTF8.decode(body))
  },
}

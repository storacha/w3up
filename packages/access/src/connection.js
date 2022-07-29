import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as HTTP from '@ucanto/transport/http'

/**
 * @param {{id : import('@ipld/dag-ucan').Identity; url: URL}} opts
 * @returns {import('@ucanto/interface').ConnectionView<import('./types').Service>}
 */
export function connection({ id, url = new URL('http://localhost:8787') }) {
  return Client.connect({
    id,
    encoder: CAR,
    decoder: CBOR,
    channel: HTTP.open({
      url,
      method: 'POST',
    }),
  })
}

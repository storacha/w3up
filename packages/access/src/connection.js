import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as HTTP from '@ucanto/transport/http'
import * as Service from './service.js'

/**
 * @param {{id : import('@ucanto/interface').Principal; url?: URL, fetch?: import('@ucanto/transport').HTTP.Fetcher}} opts
 * @returns {import('@ucanto/interface').ConnectionView<import('./types').Service>}
 */
export function connection({ id, url = Service.url, fetch }) {
  return Client.connect({
    id,
    encoder: CAR,
    decoder: CBOR,
    channel: HTTP.open({
      url,
      method: 'POST',
      fetch,
    }),
  })
}

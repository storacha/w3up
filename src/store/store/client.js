import * as Client from '@ucanto/client'
import * as API from '@ucanto/interface'
import { Principal } from '@ucanto/principal'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as HTTP from '@ucanto/transport/http'
import { fetch as defaultFetch } from 'cross-fetch'

// @ts-ignore
export * from '@web3-storage/access/capabilities/store'

/**
 * @param {object} options
 * @param {API.DID} options.id
 * @param {URL} options.url
 * @param {string} [options.method]
 * @param {HTTP.Fetcher} [options.fetch]
 * @param {API.OutpboundTranpsortOptions} [options.transport]
 * @returns {API.ConnectionView<{store: API.Store}>}
 */
export function createConnection({
  id,
  url,
  transport = { encoder: CAR, decoder: CBOR },
  fetch = defaultFetch,
  method,
}) {
  return Client.connect({
    id: Principal.parse(id),
    ...transport,
    channel: HTTP.open({
      url,
      fetch,
      method,
    }),
  })
}

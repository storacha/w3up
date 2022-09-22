import { Authority } from '@ucanto/authority'
import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as HTTP from '@ucanto/transport/http'
import webfetch from '@web-std/fetch'

import * as API from '../type.js'

/**
 * @param {object} options
 * @param {API.DID} options.id
 * @param {URL} options.url
 * @param {string} [options.method]
 * @param {HTTP.Fetcher} [options.fetch]
 * @param {API.OutpboundTranpsortOptions} [options.transport]
 * @returns {API.ConnectionView<{identity: API.Identity.Identity}>}
 */
export function connect({
  id,
  url,
  transport = { encoder: CAR, decoder: CBOR },
  fetch = webfetch,
  method,
}) {
  return Client.connect({
    id: Authority.parse(id),
    ...transport,
    channel: HTTP.open({
      url,
      fetch,
      method,
    }),
  })
}

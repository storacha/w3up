import * as Client from '@ucanto/client'
import * as API from '@ucanto/interface'
import { Principal } from '@ucanto/principal'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as HTTP from '@ucanto/transport/http'
import webfetch from 'cross-fetch'

export * from '@web3-storage/access/capabilities/identity'

// import * as CAR from '../../../patches/@ucanto/transport/car.js'

/**
 * @param {object} options
 * @param {API.DID} options.id
 * @param {URL} options.url
 * @param {string} [options.method]
 * @param {HTTP.Fetcher} [options.fetch]
 * @param {API.OutpboundTranpsortOptions} [options.transport]
 * @returns { import('@ucanto/interface').ConnectionView<any> }
 */
export const connect = ({
  id,
  url,
  transport = { encoder: CAR, decoder: CBOR },
  fetch = webfetch,
  method,
}) =>
  Client.connect({
    id: Principal.parse(id),
    ...transport,
    channel: HTTP.open({
      url,
      fetch,
      method,
    }),
  })

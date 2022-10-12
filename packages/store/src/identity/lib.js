import * as Provider from './provider.js'
import * as API from '../type.js'
import { SigningPrincipal, Principal } from '@ucanto/principal'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as HTTP from '@ucanto/transport/http'
import * as Service from '@ucanto/server'
import * as Client from '@ucanto/client'
import webfetch from '@web-std/fetch'
export * from './capability.js'

/**
 * @param {object} options
 * @param {string} options.keypair
 * @param {Provider.DB} [options.db]
 * @param {Provider.Email} [options.email]
 */
export const create = ({ keypair, db = new Map(), email = mail }) => {
  const id = SigningPrincipal.parse(keypair)
  const provider = Provider.create({
    id,
    db,
    email,
  })

  const service = Service.create({
    id,
    service: provider,
    encoder: CBOR,
    decoder: CAR,
  })

  return Object.assign(service, {
    handleRequest: service.request.bind(service),
    connect: () =>
      Client.connect({
        id: id.principal,
        encoder: CAR,
        decoder: CBOR,
        channel: service,
      }),
  })
}

/**
 * @param {object} options
 * @param {API.DID} options.id
 * @param {URL} options.url
 * @param {string} [options.method]
 * @param {HTTP.Fetcher} [options.fetch]
 * @param {API.OutpboundTranpsortOptions} [options.transport]
 * @returns {API.ConnectionView<{identity: API.Identity.Identity}>}
 */
export const connect = ({
  id,
  url,
  transport = { encoder: CAR, decoder: CBOR },
  // @ts-ignore
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

/** @type {Provider.Email} */
const mail = {
  send(to, token) {
    // eslint-disable-next-line no-console
    console.log(
      `Emailing registration token to mailto:${to}?subject=Verification&body=${token}\n`
    )
  },
}

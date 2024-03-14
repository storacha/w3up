import * as API from '../types.js'
import * as Agent from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import * as HTTP from '@ucanto/transport/http'
import { DID } from '@ucanto/core'
export const url = new URL('https://up.web3.storage')
export const id = DID.parse('did:web:web3.storage')

export * as Address from './connection/address.js'

/**
 * @template {API.UnknownProtocol} Protocol
 * @typedef {API.Connection<Protocol>} Connection
 */

/**
 * Opens ucanto connection with a service at the given address. If optional
 * `fetch` implementation is passed it will be used instead of global `fetch`
 * function. In runtime where `fetch` global is not available this option MUST
 * be provided.
 *
 * @template {Record<string, any>} [Protocol=API.W3UpProtocol]
 * @param {object} source
 * @param {API.Address<Protocol>} [source.address]
 * @param {typeof fetch} [source.fetch] - Fetch implementation to use
 * @returns {API.Connection<Protocol>}
 */
export const open = ({
  address = { id, url },
  fetch = globalThis.fetch.bind(globalThis),
} = {}) =>
  Object.assign(
    Agent.connect({
      id: address.id,
      codec: CAR.outbound,
      channel: HTTP.open({
        url: address.url,
        method: 'POST',
        fetch,
      }),
    }),
    {
      address,
    }
  )

/**
 * @type {API.Offline<API.W3UpProtocol>}
 */
export const offline = {
  id: id,
  address: { id, url },
}

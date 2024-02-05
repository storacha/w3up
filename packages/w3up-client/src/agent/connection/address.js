import * as API from '../../types.js'
import { DID } from '@ucanto/core'

/**
 * @template {API.UnknownProtocol} Protocol
 * @param {API.Address<Protocol>} address
 * @returns {API.AddressArchive<Protocol>}
 */
export const toArchive = (address) => ({
  id: address.id.did(),
  url: address.url.href,
})

/**
 * @template {API.UnknownProtocol} Protocol
 * @param {API.AddressArchive<Protocol>} archive
 * @returns {API.Address<Protocol>}
 */
export const fromArchive = (archive) => ({
  id: DID.parse(archive.id),
  url: new URL(archive.url),
})

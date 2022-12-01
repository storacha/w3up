/* eslint-disable no-console */
import * as Client from '@ucanto/client'
// import * as ed25519 from '@ucanto/principal/ed25519'
import { DID } from '@ucanto/principal'
import * as HttpChannel from '@ucanto/transport/http'

// fixtures from w3ui wip
// https://github.com/web3-storage/w3ui/blob/08bc15aca6aef0a3495e94697786551211f6edb7/packages/keyring-core/src/service.ts
export const serviceURL = new URL('https://access.web3.storage')
export const serviceKey = DID.parse(
  'did:key:z6MkrZ1r5XBFZjBU34qyD8fueMbMRkKw17BZaq2ivKFjnz2z'
)
export const servicePrincipal = serviceKey.withDID('did:web:web3.storage')

/**
 *
 * @param {object} opts
 * @param {string} [opts.url] - url to open ucanto connection to
 */
export async function testUcantoConnection(opts) {
  const ucantoHttpUrl = new URL(opts.url || serviceURL)
  console.log('testing ucanto connection against', ucantoHttpUrl.toString())
  const channel = HttpChannel.open({
    fetch,
    url: ucantoHttpUrl,
  })
  const connection = Client.connect({
    id: serviceKey,
    encoder: await import('@ucanto/transport/car'),
    decoder: await import('@ucanto/transport/cbor'),
    channel,
  })
  console.log('connection.id.did()', connection.id.did().toString())
}

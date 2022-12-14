import { connect } from '@ucanto/client'
import { CAR, CBOR, HTTP } from '@ucanto/transport'
import * as DID from '@ipld/dag-ucan/did'

export const accessServiceURL = new URL('https://access.web3.storage')
export const accessServicePrincipal = DID.parse('did:web:staging.web3.storage')

export const accessServiceConnection = connect({
  id: accessServicePrincipal,
  encoder: CAR,
  decoder: CBOR,
  channel: HTTP.open({
    url: accessServiceURL,
    method: 'POST'
  })
})

export const uploadServiceURL = new URL('https://up.web3.storage')
export const uploadServicePrincipal = DID.parse('did:web:web3.storage')

export const uploadServiceConnection = connect({
  id: uploadServicePrincipal,
  encoder: CAR,
  decoder: CBOR,
  channel: HTTP.open({
    url: uploadServiceURL,
    method: 'POST'
  })
})

/** @type {import('./types').ServiceConf} */
export const serviceConf = {
  access: accessServiceConnection,
  upload: uploadServiceConnection
}

import { connect } from '@ucanto/client'
import { CAR, CBOR, HTTP } from '@ucanto/transport'
import * as DID from '@ipld/dag-ucan/did'

export const serviceURL = new URL('https://up.web3.storage')
export const servicePrincipal = DID.parse('did:web:web3.storage')

/** @type {import('@ucanto/interface').ConnectionView<import('./types').Service>} */
export const connection = connect({
  id: servicePrincipal,
  encoder: CAR,
  decoder: CBOR,
  channel: HTTP.open({
    url: serviceURL,
    method: 'POST',
  }),
})

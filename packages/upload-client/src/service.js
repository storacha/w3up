import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import * as DID from '@ipld/dag-ucan/did'

export const serviceURL = new URL('https://up.web3.storage')
export const servicePrincipal = DID.parse('did:web:web3.storage')
export const receiptsEndpoint = 'https://up.web3.storage/receipt/'

/** @type {import('@ucanto/interface').ConnectionView<import('./types.js').Service>} */
export const connection = connect({
  id: servicePrincipal,
  codec: CAR.outbound,
  channel: HTTP.open({
    url: serviceURL,
    method: 'POST',
  }),
})

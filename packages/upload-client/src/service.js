import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import * as DID from '@ipld/dag-ucan/did'

export const serviceURL = new URL('https://up.storacha.network')
export const servicePrincipal = DID.parse('did:web:storacha.network')
export const receiptsEndpoint = 'https://up.storacha.network/receipt/'

/** @type {import('@ucanto/interface').ConnectionView<import('./types.js').Service>} */
export const connection = connect({
  id: servicePrincipal,
  codec: CAR.outbound,
  channel: HTTP.open({
    url: serviceURL,
    method: 'POST',
  }),
})

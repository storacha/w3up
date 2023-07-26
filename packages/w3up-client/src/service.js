import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import * as DID from '@ipld/dag-ucan/did'
import { connection as claimServiceConnection } from '@web3-storage/content-claims/client'

export const accessServiceURL = new URL('https://up.web3.storage')
export const accessServicePrincipal = DID.parse('did:web:web3.storage')

export const accessServiceConnection = connect({
  id: accessServicePrincipal,
  codec: CAR.outbound,
  channel: HTTP.open({
    url: accessServiceURL,
    method: 'POST',
  }),
})

export const uploadServiceURL = new URL('https://up.web3.storage')
export const uploadServicePrincipal = DID.parse('did:web:web3.storage')

export const uploadServiceConnection = connect({
  id: uploadServicePrincipal,
  codec: CAR.outbound,
  channel: HTTP.open({
    url: uploadServiceURL,
    method: 'POST',
  }),
})

/** @type {import('./types').ServiceConf} */
export const serviceConf = {
  access: accessServiceConnection,
  upload: uploadServiceConnection,
  claim: claimServiceConnection,
}

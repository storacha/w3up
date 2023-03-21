import type { Service } from '@web3-storage/access/types'
import { connect } from '@ucanto/client'
import { CAR, CBOR, HTTP } from '@ucanto/transport'
import * as DID from '@ipld/dag-ucan/did'


export const accessServiceURL = new URL(
  //'https://w3access-staging.protocol-labs.workers.dev'
  import.meta.env.VITE_W3UP_ACCESS_SERVICE_URL
)
export const accessServicePrincipal = DID.parse(
  //'did:web:staging.web3.storage'
  import.meta.env.VITE_W3UP_ACCESS_SERVICE_DID
)

export const accessServiceConnection = connect<Service>({
  id: accessServicePrincipal,
  encoder: CAR,
  decoder: CBOR,
  channel: HTTP.open<Record<string, any>>({
    url: accessServiceURL,
    method: 'POST',
  }),
})

export const uploadServiceURL = new URL(
  //'https://staging.up.web3.storage'
  import.meta.env.VITE_W3UP_UPLOAD_SERVICE_URL
)
export const uploadServicePrincipal = DID.parse(
  //'did:web:staging.web3.storage'
  import.meta.env.VITE_W3UP_UPLOAD_SERVICE_DID
)

export const uploadServiceConnection = connect<Service>({
  id: uploadServicePrincipal,
  encoder: CAR,
  decoder: CBOR,
  channel: HTTP.open<Record<string, any>>({
    url: uploadServiceURL,
    method: 'POST',
  }),
})

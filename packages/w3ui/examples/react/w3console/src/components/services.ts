import type { Service } from '@web3-storage/access/types'
import { connect } from '@ucanto/client'
import { CAR, CBOR, HTTP } from '@ucanto/transport'
import * as DID from '@ipld/dag-ucan/did'


export const accessServiceURL = new URL(
  //'https://w3access-staging.protocol-labs.workers.dev'
  import.meta.env.VITE_W3UP_ACCESS_SERVICE_URL ?? 'https://access.web3.storage'
)
export const accessServicePrincipal = DID.parse(
  //'did:web:staging.web3.storage'
  import.meta.env.VITE_W3UP_ACCESS_SERVICE_DID ?? 'did:web:web3.storage'
)

export const accessServiceConnection = connect<Service>({
  id: accessServicePrincipal,
  codec: CAR.outbound,
  channel: HTTP.open<Record<string, any>>({
    url: accessServiceURL,
    method: 'POST',
  }),
})

export const uploadServiceURL = new URL(
  //'https://staging.up.web3.storage'
  import.meta.env.VITE_W3UP_UPLOAD_SERVICE_URL ?? 'https://up.web3.storage'
)
export const uploadServicePrincipal = DID.parse(
  //'did:web:staging.web3.storage'
  import.meta.env.VITE_W3UP_UPLOAD_SERVICE_DID ?? 'did:web:web3.storage'
)

export const uploadServiceConnection = connect<Service>({
  id: uploadServicePrincipal,
  codec: CAR.outbound,
  channel: HTTP.open<Record<string, any>>({
    url: uploadServiceURL,
    method: 'POST',
  }),
})

export const gatewayHost = import.meta.env.VITE_W3UP_GATEWAY_HOST ?? 'w3s.link'

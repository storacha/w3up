import { connect } from '@ucanto/client'
import { CAR, CBOR, HTTP } from '@ucanto/transport'
import * as DID from '@ipld/dag-ucan/did'

export const serviceURL = new URL(
  'https://8609r1772a.execute-api.us-east-1.amazonaws.com'
)
export const serviceDID = DID.parse(
  'did:key:z6MkrZ1r5XBFZjBU34qyD8fueMbMRkKw17BZaq2ivKFjnz2z'
)

export const connection = connect({
  id: serviceDID,
  encoder: CAR,
  decoder: CBOR,
  channel: HTTP.open({
    url: serviceURL,
    method: 'POST',
  }),
})

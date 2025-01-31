import type { ServiceConf, Service } from '@web3-storage/w3up-client/types'
import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import type { ConnectionView, Principal } from '@ucanto/interface'
import * as DID from '@ipld/dag-ucan/did'

export interface ServiceConfig {
  servicePrincipal?: Principal
  connection?: ConnectionView<Service>
}

export function createServiceConf({
  servicePrincipal,
  connection,
}: ServiceConfig = {}): ServiceConf {
  const id =
    servicePrincipal != null
      ? servicePrincipal
      : DID.parse('did:web:web3.storage')
  const serviceConnection =
    connection != null
      ? connection
      : connect<Service>({
          id,
          codec: CAR.outbound,
          channel: HTTP.open<Service>({
            url: new URL('https://up.web3.storage'),
            method: 'POST',
          }),
        })
  return {
    access: serviceConnection,
    upload: serviceConnection,
    filecoin: serviceConnection,
  }
}

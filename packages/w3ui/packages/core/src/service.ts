import type { Service as AccessService } from '@web3-storage/access/types'
import type { Service as UploadService } from '@web3-storage/upload-client/types'
import type { StorefrontService } from '@web3-storage/filecoin-client/storefront'
import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import type {
  ConnectionView,
  Principal
} from '@ucanto/interface'
import * as DID from '@ipld/dag-ucan/did'
import { ServiceConf } from '@web3-storage/w3up-client/dist/src/types'

type Service = AccessService & UploadService & StorefrontService

export interface ServiceConfig {
  servicePrincipal?: Principal
  connection?: ConnectionView<Service>
}

export function createServiceConf ({ servicePrincipal, connection }: ServiceConfig = {}): ServiceConf {
  const id = servicePrincipal != null ? servicePrincipal : DID.parse('did:web:web3.storage')
  const serviceConnection = (connection != null)
    ? connection
    : connect<Service>({
      id,
      codec: CAR.outbound,
      channel: HTTP.open<Service>({
        url: new URL('https://up.web3.storage'),
        method: 'POST'
      })
    })
  return {
    access: serviceConnection,
    upload: serviceConnection,
    filecoin: serviceConnection
  }
}

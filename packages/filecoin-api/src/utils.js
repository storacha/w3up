import * as DID from '@ipld/dag-ucan/did'
import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'

/**
 * @param {{ did: string, url: string }} config
 */
export function getServiceConnection(config) {
  const servicePrincipal = DID.parse(config.did)
  const serviceURL = new URL(config.url)

  const serviceConnection = connect({
    id: servicePrincipal,
    codec: CAR.outbound,
    channel: HTTP.open({
      url: serviceURL,
      method: 'POST',
    }),
  })

  return serviceConnection
}

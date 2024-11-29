import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'

import * as AccessCaps from '@web3-storage/capabilities'

/**
 * Mocked Gateway/Content Serve service
 */
export function getMockService() {
  return {
    access: {
      delegate: Server.provide(
        AccessCaps.Access.delegate,
        async ({ capability, invocation }) => {
          return {
            ok: {},
          }
        }
      ),
    },
  }
}

/**
 * @param {any} service
 * @param {any} id
 */
export function getConnection(id, service) {
  const server = Server.create({
    id: id,
    service,
    codec: CAR.inbound,
    validateAuthorization: () => ({ ok: {} }),
  })
  const connection = Client.connect({
    id: id,
    codec: CAR.outbound,
    channel: server,
  })

  return { connection }
}

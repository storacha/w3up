import * as Client from '@ucanto/client'
import * as Server from '@ucanto/server'
import { HTTP } from '@ucanto/transport'
import * as CAR from '@ucanto/transport/car'
import * as AccessCaps from '@storacha/capabilities'

/**
 * Mocked Gateway/Content Serve service
 *
 * @param {{ ok: any } | { error: Server.API.Failure }} result
 */
export function getContentServeMockService(result = { ok: {} }) {
  return {
    access: {
      delegate: Server.provide(AccessCaps.Access.delegate, async () => {
        return result
      }),
    },
  }
}

/**
 * Creates a new Ucanto server with the given options.
 *
 * @param {any} id
 * @param {any} service
 */
export function createUcantoServer(id, service) {
  return Server.create({
    id: id,
    service,
    codec: CAR.inbound,
    validateAuthorization: () => ({ ok: {} }),
  })
}

/**
 * Generic function to create connection to any type of mock service with any type of signer id.
 *
 * @param {any} id
 * @param {any} service
 * @param {string | undefined} [url]
 */
export function getConnection(id, service, url = undefined) {
  const server = createUcantoServer(id, service)
  const connection = Client.connect({
    id: id,
    codec: CAR.outbound,
    channel: url ? HTTP.open({ url: new URL(url) }) : server,
  })

  return { connection }
}

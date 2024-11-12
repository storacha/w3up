import http from 'node:http'
import { once } from 'node:events'

import { parseLink } from '@ucanto/server'
import * as Signer from '@ucanto/principal/ed25519'
import { Receipt, Message } from '@ucanto/core'
import * as CAR from '@ucanto/transport/car'
import { Assert } from '@web3-storage/content-claims/capability'
import { randomCAR } from './random.js'

/**
 * @typedef {{
 *   server: http.Server
 *   serverURL: URL
 * }} TestingServer
 */

/**
 * @returns {Promise<TestingServer>}
 */
export async function createReceiptsServer() {
  /**
   * @param {http.IncomingMessage} request
   * @param {http.ServerResponse} response
   */
  const listener = async (request, response) => {
    const taskCid = request.url?.split('/')[1] ?? ''
    const body = await generateReceipt(taskCid)
    response.writeHead(200)
    response.end(body)
    return undefined
  }

  const server = http.createServer(listener).listen()

  await once(server, 'listening')

  return {
    server,
    // @ts-expect-error
    serverURL: new URL(`http://127.0.0.1:${server.address().port}`),
  }
}

/**
 * @param {string} taskCid
 */
const generateReceipt = async (taskCid) => {
  const issuer = await Signer.generate()
  const content = (await randomCAR(128)).cid
  const locationClaim = await Assert.location.delegate({
    issuer,
    audience: issuer,
    with: issuer.toDIDKey(),
    nb: {
      content,
      location: ['http://localhost'],
    },
    expiration: Infinity,
  })

  const receipt = await Receipt.issue({
    issuer,
    fx: {
      fork: [locationClaim],
    },
    /** @ts-expect-error not a UCAN Link */
    ran: parseLink(taskCid),
    result: {
      ok: {
        site: locationClaim.link(),
      },
    },
  })

  const message = await Message.build({
    receipts: [receipt],
  })
  return CAR.request.encode(message).body
}

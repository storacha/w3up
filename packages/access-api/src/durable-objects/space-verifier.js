import { stringToDelegation } from '@web3-storage/access/encoding'

/**
 *
 * @template {import('@ucanto/interface').Capabilities} [T=import('@ucanto/interface').Capabilities]
 * @param {DurableObjectNamespace} spaceVerifiers
 * @param {string} space
 * @param {import('@web3-storage/access/src/types').EncodedDelegation<T>} ucan
 */
export async function sendDelegationToSpaceVerifier(
  spaceVerifiers,
  space,
  ucan
) {
  const durableObjectID = spaceVerifiers.idFromName(space)
  const durableObject = spaceVerifiers.get(durableObjectID)
  // hostname is totally ignored by the durable object but must be set so set it to example.com
  const response = await durableObject.fetch('https://example.com/delegation', {
    method: 'PUT',
    body: ucan,
  })
  if (response.status === 400) {
    throw new Error(response.statusText)
  }
}

/**
 * @template {import('@ucanto/interface').Capabilities} [T=import('@ucanto/interface').Capabilities]
 * @param {WebSocket} server
 * @param {import('@web3-storage/access/src/types').EncodedDelegation<T>} ucan
 */
function sendDelegation(server, ucan) {
  server.send(
    JSON.stringify({
      type: 'delegation',
      delegation: ucan,
    })
  )
  server.close()
}

/**
 * SpaceVerifier
 */
export class SpaceVerifier {
  /**
   * @param {DurableObjectState} state
   */
  constructor(state) {
    this.state = state
    // `blockConcurrencyWhile()` ensures no requests are delivered until
    // initialization completes.
    this.state.blockConcurrencyWhile(async () => {
      this.ucan = await this.state.storage.get('ucan')
    })
  }

  cleanupServer() {
    this.server = undefined
  }

  async cleanupUCAN() {
    this.ucan = undefined
    // eslint-disable-next-line unicorn/no-useless-undefined
    await this.state.storage.put('ucan', undefined)
  }

  /**
   * @param {Request} req
   */
  async fetch(req) {
    const path = new URL(req.url).pathname
    if (req.method === 'GET' && path.startsWith('/validate-ws/')) {
      const upgradeHeader = req.headers.get('Upgrade')
      if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 })
      }
      if (this.server) {
        return new Response('Websocket already connected for this space.', {
          status: 409,
        })
      }
      const [client, server] = Object.values(new WebSocketPair())
      // @ts-ignore
      server.accept()
      // if the user has already verified and set this.ucan here, send them the delegation

      if (this.ucan) {
        sendDelegation(
          server,
          /** @type {import('@web3-storage/access/src/types').EncodedDelegation} */ (
            this.ucan
          )
        )
        await this.cleanupUCAN()
      } else {
        this.server = server
      }
      return new Response(undefined, {
        status: 101,
        webSocket: client,
      })
    } else if (req.method === 'PUT' && path === '/delegation') {
      const ucan = await req.text()
      const delegation = stringToDelegation(ucan)

      // it's only important to check expiration here - if we successfully validate before expiration
      // here and a user connects to the websocket later after expiration we should still send the delegation
      if (Date.now() < delegation.expiration * 1000) {
        if (this.server) {
          sendDelegation(this.server, ucan)
          this.cleanupServer()
        } else {
          await this.state.storage.put('ucan', ucan)
          this.ucan = ucan
        }
        return new Response(undefined, {
          status: 200,
        })
      } else {
        this.server?.close()
        return new Response('Delegation expired', {
          status: 400,
        })
      }
    } else {
      return new Response("SpaceVerifier can't handle this request", {
        status: 404,
      })
    }
  }
}

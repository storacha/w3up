import { stringToDelegation } from '@web3-storage/access/encoding'

/**
 * @class SpaceVerifier
 * @property {import('@cloudflare/workers-types').DurableObjectState} state
 * @property {import('@cloudflare/workers-types').string} ucan
 */
export class SpaceVerifier {
  /**
   * @param {import('@cloudflare/workers-types').DurableObjectState} state
   * @param {import('@cloudflare/workers-types').Env} env
   */
  constructor(state, env) {
    this.state = state
    // `blockConcurrencyWhile()` ensures no requests are delivered until
    // initialization completes.
    this.state.blockConcurrencyWhile(async () => {
      this.ucan = await this.state.storage.get('ucan')
    })
  }

  sendDelegation() {
    if (this.server && this.ucan) {
      this.server.send(
        JSON.stringify({
          type: 'delegation',
          delegation: this.ucan,
        })
      )
      this.server.close()
    } else {
      throw new Error(
        `cannot send ucan, server is ${this.server} and ucan is ${this.ucan}`
      )
    }
  }

  /**
   * @param {import('@cloudflare/workers-types').Request} req
   */
  async fetch(req) {
    const path = new URL(req.url).pathname
    if (req.method === 'GET' && path.startsWith('/validate-ws/')) {
      const upgradeHeader = req.headers.get('Upgrade')
      if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 })
      }

      const [client, server] = Object.values(new WebSocketPair())
      // @ts-ignore
      server.accept()
      this.server = server
      // if the user has already verified and set this.ucan here, send them the delegation
      // TODO: is this a security issue? can an attacker get access to the delegation when they shouldn't somehow?
      if (this.ucan) {
        this.sendDelegation()
      }
      return new Response(undefined, {
        status: 101,
        webSocket: client,
      })
    } else if (req.method === 'PUT' && path === '/delegation') {
      const ucan = await req.text()
      await this.state.storage.put('ucan', ucan)
      this.ucan = ucan
      const delegation = stringToDelegation(this.ucan)

      // it's only important to check expiration here - if we successfully validate before expiration
      // here and a user connects to the websocket later after expiration we should still send the delegation
      if (Date.now() < delegation.expiration * 1000) {
        if (this.server) {
          this.sendDelegation()
        }
        return new Response(undefined, {
          status: 200,
        })
      } else {
        this.server?.close()
        return new Response('Invalid expiration', {
          status: 400,
        })
      }
    } else {
      return new Response("SpaceVerifier can't handle this request", {
        status: 400,
      })
    }
  }
}

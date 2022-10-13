import { corsHeaders, preflight } from '@web3-storage/worker-utils/cors'
import { errorHandler } from '@web3-storage/worker-utils/error'
import { notFound } from '@web3-storage/worker-utils/response'
import { Router } from '@web3-storage/worker-utils/router'
import { nanoid } from 'nanoid'
import { loadConfig } from './config.js'

/**
 * @typedef {{webSocket: WebSocket; quit?: boolean; id: string}} Session
 */

/** @type Router<import('./bindings.js').RouteContext> */
const r = new Router({ onNotFound: notFound })

r.add('options', '*', preflight)

r.add('get', '/connect/:id', (request, env, ctx) => {
  const id = env.rooms.idFromName(request.params.id)

  const room = env.rooms.get(id)
  const url = new URL(request.url)
  return room.fetch(url.origin + '/connect', request)
})

/** @type {import('./bindings.js').ModuleWorker<import('./bindings.js').RouteContext>} */
const worker = {
  fetch: async (request, env, ctx) => {
    try {
      env.config = loadConfig(env)
      const rsp = await r.fetch(request, env, ctx)
      return env.config.ENV ? rsp : corsHeaders(request, rsp)
    } catch (error) {
      return errorHandler(/** @type {Error} */ (error))
    }
  },
}

export default worker

/**
 * @param {Request} request
 * @param {Error} error
 */
function sendError(request, error) {
  if (request.headers.get('Upgrade') === 'websocket') {
    const [client, server] = Object.values(new WebSocketPair())
    server.accept()
    setTimeout(() => {
      server.send(JSON.stringify({ error: error.toString() }))
      server.close(1011, error.message)
    }, 100)
    return new Response(undefined, { status: 101, webSocket: client })
  } else {
    return new Response(error.stack, { status: 500 })
  }
}

/**
 * @implements {DurableObject}
 */
export class ChatRoom {
  /**
   * @param {DurableObjectState} state
   * @param {import('./bindings.js').RouteContext} env
   */
  constructor(state, env) {
    this.state = state
    this.env = env
    /**
     * @type {Session[]}
     */
    this.sessions = []
  }

  /**
   * @param {Request} request
   */
  async fetch(request) {
    const url = new URL(request.url)
    switch (url.pathname) {
      case '/connect': {
        if (
          request.headers.get('Upgrade') !== 'websocket' &&
          this.env.config.ENV !== 'test'
        ) {
          return new Response('expected websocket', { status: 400 })
        }

        if (this.sessions.length > 1) {
          return sendError(request, new Error('too many connections'))
        }

        const [client, server] = Object.values(new WebSocketPair())
        await this.handleSession(server)
        return new Response(undefined, { status: 101, webSocket: client })
      }

      default: {
        return new Response('Not found', { status: 404 })
      }
    }
  }

  /**
   * @param {WebSocket} webSocket
   */
  async handleSession(webSocket) {
    webSocket.accept()
    /** @type {Session} */
    const session = {
      webSocket,
      id: nanoid(),
    }
    this.sessions.push(session)

    webSocket.addEventListener('message', async (msg) => {
      this.broadcast(msg.data, session)
    })

    webSocket.addEventListener('close', () => this.remove(session))
    webSocket.addEventListener('error', () => this.remove(session))
  }

  /**
   * @param {any} message
   * @param {Session} sender
   */
  broadcast(message, sender) {
    for (const session of this.sessions) {
      if (session.id !== sender.id) {
        try {
          session.webSocket.send(message)
        } catch (error) {
          this.remove(session)
          // eslint-disable-next-line no-console
          console.error(error)
        }
      }
    }
  }

  /**
   * @param {Session} session
   */
  remove(session) {
    this.sessions = this.sessions.filter((member) => member !== session)
  }
}

import pRetry from 'p-retry'

const run = async (
  /** @type {import('../models/validations').Validations} */ kv,
  /** @type {WebSocket} */ server,
  /** @type {string} */ did
) => {
  const d = await kv.get(did)

  server.send(
    JSON.stringify({
      type: 'delegation',
      delegation: d,
    })
  )
  server.close()
  await kv.delete(did)
  return d
}

/**
 * @param {import('@web3-storage/worker-utils/router').ParsedRequest} req
 * @param {import('../bindings.js').RouteContext} env
 */
export async function validateWS(req, env) {
  const upgradeHeader = req.headers.get('Upgrade')
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 })
  }

  const [client, server] = Object.values(new WebSocketPair())
  // @ts-ignore
  server.accept()
  server.addEventListener('message', async (msg) => {
    // @ts-ignore
    const { did } = JSON.parse(msg.data)

    try {
      await pRetry(() => run(env.models.validations, server, did), {
        retries: 200,
        minTimeout: 1000,
        factor: 1,
      })
    } catch (error) {
      const err = /** @type {Error} */ (error)
      server.send(
        JSON.stringify({
          type: 'timeout',
          error: err.message,
        })
      )
      server.close()
    }
  })

  return new Response(undefined, {
    status: 101,
    webSocket: client,
  })
}

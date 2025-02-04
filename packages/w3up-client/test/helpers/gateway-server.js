import { createServer } from 'node:http'
import {
  createUcantoServer,
  getContentServeMockService,
} from '../mocks/service.js'
import { gateway } from '@storacha/upload-api/test/utils'

const port = 5001

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.end()

  if (req.method === 'POST') {
    const service = getContentServeMockService()
    const server = createUcantoServer(gateway, service)

    const bodyBuffer = Buffer.concat(await collect(req))

    const reqHeaders = /** @type {Record<string, string>} */ (
      Object.fromEntries(Object.entries(req.headers))
    )

    const { headers, body, status } = await server.request({
      body: new Uint8Array(
        bodyBuffer.buffer,
        bodyBuffer.byteOffset,
        bodyBuffer.byteLength
      ),
      headers: reqHeaders,
    })

    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value)
    }
    res.writeHead(status ?? 200)
    res.end(body)
  }
  res.end()
})

/** @param {import('node:stream').Readable} stream */
const collect = (stream) => {
  return /** @type {Promise<Buffer[]>} */ (
    new Promise((resolve, reject) => {
      const chunks = /** @type {Buffer[]} */ ([])
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      stream.on('error', (err) => reject(err))
      stream.on('end', () => resolve(chunks))
    })
  )
}

// eslint-disable-next-line no-console
server.listen(port, () =>
  console.log(`[Mock] Gateway Server Listening on :${port}`)
)

process.on('SIGTERM', () => process.exit(0))

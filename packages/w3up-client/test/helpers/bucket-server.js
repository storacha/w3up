import { createServer } from 'node:http'
import { Buffer } from 'node:buffer'

const port = process.env.PORT ?? 8989
const status = process.env.STATUS ? parseInt(process.env.STATUS) : 200

const data = new Map()

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.end()

  res.statusCode = status
  if (status === 200) {
    const key = new URL(req.url ?? '', 'http://localhost').pathname
    if (req.method === 'GET') {
      const body = data.get(key)
      if (!body) {
        res.statusCode = 404
      } else {
        res.write(body)
      }
    } else if (req.method === 'PUT') {
      
      const body = Buffer.concat(await collect(req))
      data.set(key, body)
    }
  }
  res.end()
})

/** @param {import('node:stream').Readable} stream */
const collect = stream => {
  return /** @type {Promise<Buffer[]>} */ (new Promise((resolve, reject) => {
    const chunks = /** @type {Buffer[]} */ ([])
    stream.on('data', chunk => chunks.push(Buffer.from(chunk)))
    stream.on('error', err => reject(err))
    stream.on('end', () => resolve(chunks))
  }))
}

// eslint-disable-next-line no-console
server.listen(port, () => console.log(`Listening on :${port}`))

process.on('SIGTERM', () => process.exit(0))

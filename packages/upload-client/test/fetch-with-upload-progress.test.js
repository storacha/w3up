import { createServer } from 'node:http'
import { fetchWithUploadProgress } from '../src/fetch-with-upload-progress.js'
import assert from 'node:assert'

const encoder = new TextEncoder()
const body = encoder.encode('Hello World'.repeat(1024))

describe('fetchWithUploadProgress', () => {
  it('should stream with Node.js and Bun HTTP/1.1', async () => {
    const server = createServer((req, res) => {
      res.end(`Hello from ${req.httpVersion}`)
    })

    const listener = server.listen()

    /**
     * @type {import('node:net').AddressInfo}
     */
    // @ts-expect-error - it's always AddressInfo
    const address = listener.address()

    let total = 0

    await fetchWithUploadProgress(new URL(`http://localhost:${address.port}`), {
      method: 'POST',
      body,
      // @ts-expect-error - this is needed by recent versions of node - see https://github.com/bluesky-social/atproto/pull/470 for more info
      duplex: 'half',
      onUploadProgress: (payload) => {
        total += payload.loaded
        assert.equal(payload.lengthComputable, false)
      },
    })
      .then((res) => res.text())
      .then((text) => {
        assert.equal(text, 'Hello from 1.1')
        assert.equal(total, body.byteLength)
      }).finally(() => {
        server.close()
      })
  })
})

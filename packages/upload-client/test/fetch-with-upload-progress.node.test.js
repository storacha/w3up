import { createServer } from 'node:http'
import { fetchWithUploadProgress, iterateBodyWithProgress } from '../src/fetch-with-upload-progress.js'
import assert from 'node:assert'

const encoder = new TextEncoder()
const body = encoder.encode('Hello World'.repeat(1024))

describe('fetchWithUploadProgress', () => {
  it('should not stream if onUploadOptions is specified', async () => {
    const server = createServer((req, res) => {
      res.end(`Hello from ${req.httpVersion}`)
    })

    const listener = server.listen()

    /**
     * @type {import('node:net').AddressInfo}
     */
    // @ts-expect-error - it's always AddressInfo
    const address = listener.address()

    await fetchWithUploadProgress(new URL(`http://localhost:${address.port}`), {
      method: 'POST',
      body,
    })
      .then((res) => res.text())
      .then((text) => {
        assert.equal(text, 'Hello from 1.1')
      })
      .finally(() => {
        server.close()
      })
  })
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
      })
      .finally(() => {
        server.close()
      })
  })
})

describe('iterateBodyWithProgress', () => {
  it('should throw if body is not a ReadableStream', async () => {
    const body = new Uint8Array(1024)

    await assert.rejects(
      async () => {
        // @ts-expect-error - body is not a ReadableStream
        for await (const chunk of iterateBodyWithProgress(body, () => void 0)) {
          // do nothing
        }
      },
      {
        name: 'Error',
        message: 'Body is not a ReadableStream',
      }
    )
  })
  it('should re-throw an error if it happens during read', async () => {
    const body = new ReadableStream({ start: async () => {
      throw new Error('oops')
    } })

    await assert.rejects(
      async () => {
        // @ts-expect-error - body is not a ReadableStream
        for await (const chunk of iterateBodyWithProgress(body, () => void 0)) {
          // do nothing
        }
      },
      {
        name: 'Error',
        message: 'oops',
      }
    )
  })
})
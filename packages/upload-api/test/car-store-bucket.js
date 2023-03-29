import * as API from '../src/types.js'
import { base64pad } from 'multiformats/bases/base64'
import HTTP from 'node:http'
import { SigV4 } from '@web3-storage/sigv4'
import { sha256 } from 'multiformats/hashes/sha2'

/**
 * @implements {API.CarStoreBucket}
 */
export class CarStoreBucket {
  /**
   * @param {API.CarStoreBucketOptions} [options]
   */
  static async activate(options) {
    const content = new Map()
    const server = HTTP.createServer(async (request, response) => {
      if (request.method === 'PUT') {
        const buffer = new Uint8Array(
          parseInt(request.headers['content-length'] || '0')
        )
        let offset = 0

        for await (const chunk of request) {
          buffer.set(chunk, offset)
          offset += chunk.length
        }

        const hash = await sha256.digest(buffer)
        const checksum = base64pad.baseEncode(hash.digest)

        if (checksum !== request.headers['x-amz-checksum-sha256']) {
          response.writeHead(400, `checksum mismatch`)
        } else {
          const { pathname } = new URL(request.url || '/', url)
          content.set(pathname, buffer)
          response.writeHead(200)
        }
      } else {
        response.writeHead(405)
      }

      response.end()
      // otherwise it keep connection lingering
      response.destroy()
    })
    await new Promise((resolve) => server.listen(resolve))

    // @ts-ignore - this is actually what it returns on http
    const port = server.address().port
    const url = new URL(`http://localhost:${port}`)

    return new CarStoreBucket({
      ...options,
      content,
      server: Object.assign(server, { url }),
    })
  }

  /**
   * @param {API.CarStoreBucketOptions & { server: HTTP.Server & { url: URL }, content: Map<string, Uint8Array> }} options
   */
  constructor({
    content,
    server,
    accessKeyId = 'id',
    secretAccessKey = 'secret',
    bucket = 'my-bucket',
    region = 'eu-central-1',
    expires,
  }) {
    this.server = server
    this.accessKeyId = accessKeyId
    this.secretAccessKey = secretAccessKey
    this.bucket = bucket
    this.region = region
    this.expires = expires
    this.content = content
  }

  /**
   * @returns {Promise<void>}
   */
  deactivate() {
    return new Promise((resolve, reject) => {
      // does not exist in node 16
      if (typeof this.server.closeAllConnections === 'function') {
        this.server.closeAllConnections()
      }

      this.server.close((error) => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }

  /**
   *
   * @param {API.UnknownLink} link
   */
  async has(link) {
    return this.content.has(`/${this.bucket}/${link}/${link}.car`)
  }

  /**
   * @param {API.UnknownLink} link
   * @param {number} size
   */
  async createUploadUrl(link, size) {
    const { bucket, expires, accessKeyId, secretAccessKey, region, server } =
      this
    // sigv4
    const sig = new SigV4({
      accessKeyId,
      secretAccessKey,
      region,
    })

    const checksum = base64pad.baseEncode(link.multihash.digest)
    const { pathname, search, hash } = sig.sign({
      key: `${link}/${link}.car`,
      checksum,
      bucket,
      expires,
    })

    const url = new URL(server.url)
    url.search = search
    url.pathname = `/${bucket}${pathname}`
    url.hash = hash
    url.searchParams.set(
      'X-Amz-SignedHeaders',
      ['content-length', 'host', 'x-amz-checksum-sha256'].join(';')
    )

    return {
      url,
      headers: {
        'x-amz-checksum-sha256': checksum,
        'content-length': String(size),
      },
    }
  }
}

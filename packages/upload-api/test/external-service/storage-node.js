import * as API from '../../src/types.js'
import * as BlobCapabilities from '@storacha/capabilities/blob'
import { base64pad } from 'multiformats/bases/base64'
import { Assert } from '@web3-storage/content-claims/capability'
import { base58btc } from 'multiformats/bases/base58'
import { sha256 } from 'multiformats/hashes/sha2'
import * as Digest from 'multiformats/hashes/digest'
import { ok, error, Failure } from '@ucanto/core'
import { ed25519 } from '@ucanto/principal'
import { CAR, HTTP } from '@ucanto/transport'
import * as Server from '@ucanto/server'
import { connect } from '@ucanto/client'
import { BlobNotFound } from '../../src/blob/lib.js'

export const MaxUploadSize = 127 * (1 << 25)

/** @param {API.MultihashDigest} digest */
const contentKey = (digest) => {
  const encodedMultihash = base58btc.encode(digest.bytes)
  return `${encodedMultihash}/${encodedMultihash}.blob`
}

export class StorageNode {
  /** @param {{ http?: import('http'), port?: number, claimsService: API.ClaimsClientConfig } & import('@ucanto/interface').PrincipalResolver} config */
  static async activate(config) {
    const id = await ed25519.generate()
    const content = new Map()
    const allocations = new Set()
    /** @type {URL} */
    let baseURL

    /** @param {API.MultihashDigest} digest */
    const hasContent = async (digest) => {
      if (config.http) {
        return content.has(contentKey(digest))
      }
      // if no http server, the content should be available at the base URL
      // a "public bucket" used in tests.
      const res = await fetch(new URL(contentKey(digest), baseURL))
      return res.status === 200
    }

    const server = Server.create({
      id,
      codec: CAR.inbound,
      service: /** @type {import('../../src/types/blob.js').BlobService} */ ({
        blob: {
          allocate: Server.provideAdvanced({
            capability: BlobCapabilities.allocate,
            handler: async ({ capability }) => {
              const digest = Digest.decode(capability.nb.blob.digest)
              const checksum = base64pad.baseEncode(digest.digest)
              if (capability.nb.blob.size > MaxUploadSize) {
                return Server.error(
                  new BlobSizeLimitExceededError(capability.nb.blob.size)
                )
              }
              if (await hasContent(digest)) {
                return Server.ok({ size: 0 })
              }

              const key = contentKey(digest)
              const size = allocations.has(key) ? 0 : capability.nb.blob.size
              allocations.add(key)

              return Server.ok({
                size,
                address: {
                  url: new URL(contentKey(digest), baseURL).toString(),
                  headers: { 'x-amz-checksum-sha256': checksum },
                  expires: 60 * 60 * 24,
                },
              })
            },
          }),
          accept: Server.provideAdvanced({
            capability: BlobCapabilities.accept,
            handler: async ({ capability }) => {
              const digest = Digest.decode(capability.nb.blob.digest)
              if (!(await hasContent(digest))) {
                return Server.error(new AllocatedMemoryNotWrittenError())
              }

              const receipt = await publishLocationCommitment(config, {
                space: capability.nb.space,
                digest,
                location:
                  /** @type {API.URI} */
                  (new URL(contentKey(digest), baseURL).toString()),
              })
              if (receipt.out.error) {
                return receipt.out
              }

              return Server.ok({ site: receipt.ran.link() }).fork(receipt.ran)
            },
          }),
        },
      }),
      // @ts-expect-error
      resolveDIDKey: config.resolveDIDKey,
      validateAuthorization: () => ({ ok: {} }),
    })

    if (!config.http) {
      baseURL = new URL(`http://127.0.0.1:${config.port ?? 8989}`)
      const connection = connect({ id, codec: CAR.outbound, channel: server })
      return new StorageNode({ id, content, url: baseURL, connection })
    }

    const httpServer = config.http.createServer(async (request, response) => {
      try {
        const { pathname } = new URL(request.url ?? '/', baseURL)
        if (request.method === 'POST') {
          const chunks = []
          for await (const chunk of request) {
            chunks.push(chunk)
          }

          const { status, headers, body } = await server.request({
            headers: Object.fromEntries(
              Object.entries(request.headers).map(([k, v]) => [k, String(v)])
            ),
            body: new Uint8Array(await new Blob(chunks).arrayBuffer()),
          })

          response.writeHead(status ?? 200, headers)
          response.write(body)
        } else if (request.method === 'PUT') {
          const length = parseInt(request.headers['content-length'] ?? '0')
          const buffer = new Uint8Array(length)
          let offset = 0
          for await (const chunk of request) {
            buffer.set(chunk, offset)
            offset += chunk.length
          }
          const digest = await sha256.digest(buffer)
          const checksum = base64pad.baseEncode(digest.digest)

          if (checksum !== request.headers['x-amz-checksum-sha256']) {
            response.writeHead(400, `checksum mismatch`)
          } else {
            content.set(contentKey(digest), buffer)
            response.writeHead(200)
          }
        } else if (request.method === 'GET') {
          const data = content.get(pathname.slice(1))
          if (data) {
            response.writeHead(200)
            response.write(data)
          } else {
            response.writeHead(404)
          }
        } else {
          response.writeHead(405)
        }
      } catch (err) {
        console.error(err)
        response.writeHead(500)
      }

      response.end()
      // otherwise it keep connection lingering
      response.destroy()
    })
    await /** @type {Promise<void>} */ (
      new Promise((resolve) => {
        if (config.port) {
          return httpServer.listen(port, resolve)
        }
        httpServer.listen(resolve)
      })
    )

    // @ts-ignore - this is actually what it returns on http
    const { port } = httpServer.address()
    baseURL = new URL(`http://127.0.0.1:${port}`)
    const channel = HTTP.open({ url: baseURL, method: 'POST' })
    const connection = connect({ id, codec: CAR.outbound, channel })
    return new StorageNode({
      id,
      content,
      url: baseURL,
      connection,
      server: httpServer,
    })
  }

  async deactivate() {
    const { server } = this
    if (server) {
      await new Promise((resolve, reject) => {
        server.closeAllConnections()
        server.close((error) => {
          if (error) {
            reject(error)
          } else {
            resolve(undefined)
          }
        })
      })
    } else {
      await fetch(new URL('/reset', this.baseURL), { method: 'POST' })
    }
  }

  /**
   * @param {{
   *   id: API.Signer
   *   url: URL
   *   content: Map<string, Uint8Array>
   *   connection: import('@ucanto/interface').Connection<import('../../src/types/blob.js').BlobService>
   *   server?: import('http').Server
   * }} options
   */
  constructor({ id, url, content, connection, server }) {
    this.id = id
    this.baseURL = url
    this.content = content
    this.connection = connection
    this.server = server
  }

  /** @param {API.MultihashDigest} digest */
  async stream(digest) {
    const key = contentKey(digest)
    if (!this.server) {
      const url = new URL(key, this.baseURL)
      const res = await fetch(url.toString())
      if (res.status === 404) return error(new BlobNotFound(digest))
      if (!res.ok || !res.body) {
        throw new Error(
          `serverless blob storage failed to fetch from: ${url} status: ${res.status}`
        )
      }
      return ok(res.body)
    }

    const bytes = this.content.get(key)
    if (!bytes) return error(new BlobNotFound(digest))

    return ok(
      new ReadableStream({
        pull(controller) {
          controller.enqueue(bytes)
          controller.close()
        },
      })
    )
  }
}

export class AllocatedMemoryNotWrittenError extends Failure {
  static name = 'AllocatedMemoryHadNotBeenWrittenTo'

  get name() {
    return AllocatedMemoryNotWrittenError.name
  }

  describe() {
    return 'Blob not found'
  }
}

export class BlobSizeLimitExceededError extends Failure {
  static name = 'BlobSizeOutsideOfSupportedRange'

  get name() {
    return BlobSizeLimitExceededError.name
  }

  /** @param {number} size */
  constructor(size) {
    super()
    this.size = size
  }

  describe() {
    return `Blob of ${this.size} bytes, exceeds size limit of ${MaxUploadSize} bytes`
  }
}

/**
 * @param {API.ClaimsClientContext} ctx
 * @param {{ space: API.SpaceDID, digest: API.MultihashDigest, location: API.URI }} params
 */
const publishLocationCommitment = async (ctx, { digest, location }) => {
  const { invocationConfig, connection } = ctx.claimsService
  const { issuer, audience, with: resource, proofs } = invocationConfig
  return await Assert.location
    .invoke({
      issuer,
      audience,
      with: resource,
      nb: { content: { digest: digest.bytes }, location: [location] },
      expiration: Infinity,
      proofs,
    })
    .execute(connection)
}

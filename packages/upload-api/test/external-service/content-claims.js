import * as API from '../../src/types.js'
import { connect } from '@ucanto/client'
import { ed25519 } from '@ucanto/principal'
import { CAR, HTTP } from '@ucanto/transport'
import { Assert } from '@web3-storage/content-claims/capability'
import * as Client from '@web3-storage/content-claims/client'
import * as Server from '@web3-storage/content-claims/server'
import { DigestMap } from '@storacha/blob-index'

/**
 * @param {object} params
 * @param {API.Signer} params.serviceSigner
 * @param {API.Transport.Channel<API.ClaimsService>} params.channel
 * @returns {Promise<API.ClaimsClientConfig>}
 */
export const create = async ({ serviceSigner, channel }) => {
  const agent = await ed25519.generate()
  const proofs = [
    await Assert.assert.delegate({
      issuer: serviceSigner,
      with: serviceSigner.did(),
      audience: agent,
    }),
  ]
  return {
    invocationConfig: {
      issuer: agent,
      with: serviceSigner.did(),
      audience: serviceSigner,
      proofs,
    },
    connection: connect({
      id: serviceSigner,
      codec: CAR.outbound,
      channel,
    }),
  }
}

/**
 * @param {{ http?: import('node:http') }} [options]
 * @returns {Promise<API.ClaimsClientConfig & API.ClaimReader & API.Deactivator>}
 */
export const activate = async ({ http } = {}) => {
  const serviceSigner = await ed25519.generate()

  const claimStore = new ClaimStorage()
  /** @param {API.MultihashDigest} content */
  const read = async (content) => {
    /** @type {import('@web3-storage/content-claims/client/api').Claim[]} */
    const claims = []
    await Server.walkClaims(
      { claimFetcher: claimStore },
      content,
      new Set()
    ).pipeTo(
      new WritableStream({
        async write(block) {
          const claim = await Client.decode(block.bytes)
          claims.push(claim)
        },
      })
    )
    return { ok: claims }
  }

  const server = Server.createServer({
    id: serviceSigner,
    codec: CAR.inbound,
    claimStore,
    validateAuthorization: () => ({ ok: {} }),
  })

  if (!http) {
    const conf = await create({ serviceSigner, channel: server })
    return Object.assign(conf, { read, deactivate: async () => {} })
  }

  const httpServer = http.createServer(async (req, res) => {
    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }

    const { status, headers, body } = await server.request({
      // @ts-expect-error
      headers: req.headers,
      body: new Uint8Array(await new Blob(chunks).arrayBuffer()),
    })

    res.writeHead(status ?? 200, headers)
    res.write(body)
    res.end()
  })
  await new Promise((resolve) => httpServer.listen(resolve))
  // @ts-expect-error
  const { port } = httpServer.address()
  const serviceURL = new URL(`http://127.0.0.1:${port}`)

  const channel = HTTP.open({ url: serviceURL, method: 'POST' })
  const conf = await create({ serviceSigner, channel })
  return Object.assign(conf, {
    read,
    deactivate: () =>
      new Promise((resolve, reject) => {
        httpServer.closeAllConnections()
        httpServer.close((err) => {
          if (err) {
            reject(err)
          } else {
            resolve(undefined)
          }
        })
      }),
  })
}

class ClaimStorage {
  constructor() {
    /** @type {Map<API.MultihashDigest, import('@web3-storage/content-claims/server/api').Claim[]>} */
    this.data = new DigestMap()
  }

  /** @param {import('@web3-storage/content-claims/server/api').Claim} claim */
  async put(claim) {
    const claims = this.data.get(claim.content) ?? []
    claims.push(claim)
    this.data.set(claim.content, claims)
  }

  /** @param {API.MultihashDigest} content */
  async get(content) {
    return this.data.get(content) ?? []
  }
}

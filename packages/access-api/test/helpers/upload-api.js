// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'

/**
 * @param {object} options
 * @param {Ucanto.Verifier} options.id
 * @returns {Ucanto.ServerView<{
 * store: import('../../src/service/upload-api-proxy.js').StoreServiceInferred
 * upload: import('../../src/service/upload-api-proxy.js').UploadServiceInferred
 * }>}
 */
export function createMockUploadApiServer({ id }) {
  // eslint-disable-next-line unicorn/consistent-function-scoping
  async function serviceMethod() {
    return { mockUploadAPi: true }
  }
  const server = Server.create({
    id,
    decoder: CAR,
    encoder: CBOR,
    service: {
      store: {
        list: serviceMethod,
        add: serviceMethod,
        remove: serviceMethod,
      },
      upload: {
        list: serviceMethod,
        add: serviceMethod,
        remove: serviceMethod,
      },
    },
  })
  return server
}

/**
 * @template {Record<string,any>} T
 * @param {Ucanto.ServerView<T>} ucantoServer
 */
export function ucantoServerNodeListener(ucantoServer) {
  /** @type {import('node:http').RequestListener} */
  return async (request, response) => {
    const chunks = []
    for await (const chunk of request) {
      chunks.push(chunk)
    }
    try {
      const { headers, body } = await ucantoServer.request({
        headers: /** @type {Record<string,string>} */ ({ ...request.headers }),
        body: Buffer.concat(chunks),
      })
      response.writeHead(200, headers)
      response.write(body)
      response.end()
    } catch (error) {
      response.writeHead(500)
      response.end(error)
    }
  }
}

/**
 * @param {import('node:net').AddressInfo|string|null} address - this is type from server.address()
 * @returns {URL}
 */
export function serverLocalUrl(address) {
  if (!address || typeof address !== 'object')
    throw new Error(`cant determine local url from address`)
  return new URL(`http://localhost:${address.port}`)
}

/**
 * @param {import('node:http').Server} server
 * @returns Promise<URL>
 */
export async function listen(server) {
  await new Promise((resolve, reject) => {
    server.listen(0, () => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      resolve(undefined)
    })
  })
  return serverLocalUrl(server.address())
}
